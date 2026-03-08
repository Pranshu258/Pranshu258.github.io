import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
## Constraints

- Requires \`--gemm_plugin disable\` at build time. Weight Streaming only supports native (non-plugin) weight tensors; TensorRT plugin-managed weights cannot be streamed.
- This is a TensorRT-backend feature. It is not available for the PyTorch backend.

## Implementation

### Build Time



### Runtime

At runtime, TRT-LLM computes a byte budget from the user-supplied percentage and hands it to TensorRT. The C++ path lives in \`tllmRuntime.cpp\`:

\`\`\`cpp
// cpp/tensorrt_llm/runtime/tllmRuntime.cpp
void setWeightStreaming(nvinfer1::ICudaEngine& engine, float const gpuWeightsPercent)
{
    if (gpuWeightsPercent < 1)
    {
        int64_t streamableSize = engine.getStreamableWeightsSize(); // total bytes eligible for streaming
        int64_t budget = gpuWeightsPercent * streamableSize;        // bytes to keep on GPU
        engine.setWeightStreamingBudgetV2(budget);                  // pass budget to TensorRT
    }
}
\`\`\`

This is called immediately after the engine is deserialised inside \`TllmRuntime\`'s constructor, before any execution contexts are created:

\`\`\`cpp
// cpp/tensorrt_llm/runtime/tllmRuntime.cpp
mEngine.reset(mRuntime->deserializeCudaEngine(...));
setWeightStreaming(getEngine(), gpuWeightsPercent);
\`\`\`

The equivalent Python path in \`session.py\` uses the Python bindings to the same TensorRT API:

\`\`\`python
# tensorrt_llm/runtime/session.py
def _set_weight_streaming(self, gpu_weights_percent):
    max = self.engine.streamable_weights_size        # total streamable bytes
    budget = int(gpu_weights_percent * max)
    self.engine.weight_streaming_budget_v2 = budget  # TensorRT property setter
\`\`\`

### What TensorRT Does

\`setWeightStreamingBudgetV2\` / \`weight_streaming_budget_v2\` are TensorRT SDK APIs (closed-source, in \`libnvinfer.so\`). Once the budget is set, TensorRT manages the streaming transparently inside each call to \`executeContext()\`:

1. Before a layer executes, TRT checks whether its weights are currently in GPU memory.
2. If not, it transfers them from the pinned CPU buffer over PCIe.
3. After the layer completes, if the GPU budget is exhausted, TRT may evict weights for other layers back to CPU to make room.

The \`gpuWeightsPercent = 0.0\` extreme means *all* streamable weights are kept on CPU and transferred just-in-time; \`gpuWeightsPercent = 1.0\` (the default) disables streaming entirely — all weights remain on GPU as normal.

## Usage

### CLI

\`\`\`bash
# 1. Build the engine with weight streaming enabled
trtllm-build \\
    --checkpoint_dir /tmp/llama_7b/trt_ckpt/fp16/1-gpu/ \\
    --output_dir /tmp/llama_7b/trt_engines/fp16/1-gpu/ \\
    --weight_streaming \\
    --gemm_plugin disable \\
    --max_batch_size 128 \\
    --max_input_len 512 \\
    --max_seq_len 562

# 2. Run with 20% of streamable weights kept on GPU (80% streamed from CPU)
python3 examples/summarize.py \\
    --engine_dir /tmp/llama_7b/trt_engines/fp16/1-gpu/ \\
    --hf_model_dir llama-7b-hf/ \\
    --data_type fp16 \\
    --gpu_weights_percent 0.2
\`\`\`

### C++ Executor API

\`\`\`cpp
#include "tensorrt_llm/executor/executor.h"

namespace tle = tensorrt_llm::executor;

// Keep 50% of streamable weights on GPU
auto executorConfig = tle::ExecutorConfig(/*gpuWeightsPercent=*/0.5f);
auto executor = tle::Executor(
    "model_path",
    tle::ModelType::kDECODER_ONLY,
    executorConfig
);
\`\`\`

\`ExecutorConfig\` also provides \`setGpuWeightsPercent(float)\` and \`getGpuWeightsPercent()\` for programmatic configuration after construction.

## Comparison: HuggingFace Accelerate

HuggingFace Accelerate implements the same concept in pure Python for arbitrary PyTorch models, without requiring a specially compiled engine. Understanding it makes TRT-LLM's approach clearer by contrast.

### Mechanism

Accelerate uses \`AlignDevicesHook\` with \`offload=True\`, attached to each module via \`add_hook_to_module\`, which monkey-patches \`module.forward\` to inject load/evict calls around the original forward:

\`\`\`python
# accelerate/hooks.py — patched forward installed by add_hook_to_module
def new_forward(module, *args, **kwargs):
    args, kwargs = module._hf_hook.pre_forward(module, *args, **kwargs)  # 1. load weights
    output = module._old_forward(*args, **kwargs)                         # 2. run layer
    return module._hf_hook.post_forward(module, output)                  # 3. evict weights
\`\`\`

**Setup (\`init_hook\`)** — weight data is copied to CPU and the module's parameters are replaced with zero-byte \`meta\` tensors so they occupy no device memory:

\`\`\`python
# accelerate/hooks.py — AlignDevicesHook.init_hook
self.weights_map = {
    name: param.to("cpu")
    for name, param in named_module_tensors(module, ...)
}
# Replace every tensor with a meta (placeholder) tensor — zero GPU/CPU memory used
for name, _ in named_module_tensors(module, ...):
    set_module_tensor_to_device(module, name, "meta")
\`\`\`

**Before each layer (\`pre_forward\`)** — real tensors are fetched from \`weights_map\` and materialised on the execution device (GPU) just before \`forward\` runs:

\`\`\`python
# accelerate/hooks.py — AlignDevicesHook.pre_forward
for name, _ in named_module_tensors(module, ...):
    value = self.weights_map[name]  # real data from CPU (or disk, if using disk offload)
    set_module_tensor_to_device(module, name, self.execution_device, value=value)
\`\`\`

**After each layer (\`post_forward\`)** — weights are immediately evicted back to \`meta\`, freeing GPU VRAM before the next layer loads:

\`\`\`python
# accelerate/hooks.py — AlignDevicesHook.post_forward
for name, _ in named_module_tensors(module, ...):
    set_module_tensor_to_device(module, name, "meta")
\`\`\`

\`weights_map\` can be a plain dict (CPU RAM offload) or a lazy map backed by memory-mapped safetensors files (disk offload), enabling models far larger than system RAM.

### TRT-LLM vs. Accelerate

| | TRT-LLM | HuggingFace Accelerate |
|---|---|---|
| **Granularity** | Budget in bytes; TRT decides which weights to evict | Per-module (all weights of a module move together) |
| **Who manages movement** | TensorRT internals (\`libnvinfer.so\`) | Python hooks around \`module.forward\` |
| **Overhead** | Minimal — managed inside CUDA execution pipeline | Python-level overhead per layer call |
| **Flexibility** | Requires TensorRT engine with \`WEIGHT_STREAMING\` flag | Works on any \`nn.Module\` without recompilation |
| **Storage source** | Pinned CPU RAM only | CPU RAM or memory-mapped disk (safetensors) |
| **Tied weights** | Handled by TRT internally | Tracked explicitly via \`tied_params_map\` to avoid duplication |

## Tuning

\`gpu_weights_percent\` is a continuous knob between \`0.0\` and \`1.0\`:

| Value | Effect |
|-------|--------|
| \`1.0\` (default) | No streaming — all weights on GPU, full throughput |
| \`0.5\` | Half streaming — moderate memory savings, some latency increase |
| \`0.0\` | Maximum streaming — minimum GPU memory, maximum latency overhead |

Start from \`1.0\` and decrease until the engine fits within the available GPU memory budget. PCIe bandwidth (typically 16–32 GB/s) is the bottleneck when streaming is active, so very low values will significantly reduce throughput on bandwidth-bound workloads.
`;

export default function WeightStreaming() {
    return <div>
        <p>
            Large langauge models may not fit entirely in GPU VRAM. Weight Streaming reduces GPU memory consumption by keeping only a fraction of model weights in GPU memory and streaming the rest from CPU memory on demand during inference.
            This trades off memory footprint against inference latency — the more weights you stream from CPU, the lower the GPU memory usage, but the slower each forward pass becomes due to PCIe bandwidth constraints.
        </p>
        <h2>Nvidia's TensorRT-LLM Engine</h2>
        <p>
            In TensorRT-LLM, weight Streaming is enabled by setting the <code>WEIGHT_STREAMING</code> builder flag when constructing the TensorRT engine. In TRT-LLM this happens in <code>Builder.create_builder_config()</code>. When this flag is set, TensorRT annotates the eligible weight tensors in the serialised engine as streamable and records their total size. Weights that belong to plugin layers are ineligible and stay resident on the GPU as normal.
        </p>
        <p>
            :

\`\`\`python
# tensorrt_llm/builder.py
if weight_streaming:
    config.set_flag(trt.BuilderFlag.WEIGHT_STREAMING)
\`\`\`

\`BuildConfig\` exposes this as a Pydantic field:

\`\`\`python
# tensorrt_llm/builder.py
weight_streaming: bool = Field(default=False, ...)
\`\`\`


        </p>
    </div>;
}
