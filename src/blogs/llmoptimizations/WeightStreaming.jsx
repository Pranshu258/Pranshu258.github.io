import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-bash';
import '../../styles/prism.css';

export default function WeightStreaming() {
    useEffect(() => {
        Prism.highlightAll();
    }, []);
    return (
        <div>
            <p>
                Large language models may not fit entirely in GPU VRAM. Weight Streaming reduces GPU memory
                consumption by keeping only a fraction of model weights in GPU memory and streaming the rest
                from CPU memory on demand during inference. This trades off memory footprint against inference
                latency &mdash; the more weights you stream from CPU, the lower the GPU memory usage, but the
                slower each forward pass becomes due to PCIe bandwidth constraints.
            </p>

            <h2>Nvidia TensorRT-LLM</h2>
            <p>
                In TensorRT-LLM, weight streaming is enabled by setting the <code>WEIGHT_STREAMING</code> builder
                flag when constructing the TensorRT engine. In TRT-LLM this happens in{' '}
                <code>Builder.create_builder_config()</code>. When this flag is set, TensorRT annotates the eligible
                weight tensors in the serialised engine as streamable and records their total size. Weights that
                belong to plugin layers are ineligible and stay resident on the GPU as normal.
            </p>

            <p>The flag is set inside <code>Builder.create_builder_config()</code>:</p>
            <pre><code className="language-python">{`# tensorrt_llm/builder.py
if weight_streaming:
    config.set_flag(trt.BuilderFlag.WEIGHT_STREAMING)`}</code></pre>
            <p><code>BuildConfig</code> exposes this as a Pydantic field:</p>
            <pre><code className="language-python">{`# tensorrt_llm/builder.py
weight_streaming: bool = Field(default=False, ...)`}</code></pre>

            <p>
                At runtime, TRT-LLM computes a byte budget from the user-supplied percentage and hands it to
                TensorRT. The C++ path lives in <code>tllmRuntime.cpp</code>:
            </p>
            <pre><code className="language-cpp">{`// cpp/tensorrt_llm/runtime/tllmRuntime.cpp
void setWeightStreaming(nvinfer1::ICudaEngine& engine, float const gpuWeightsPercent)
{
    if (gpuWeightsPercent < 1)
    {
        int64_t streamableSize = engine.getStreamableWeightsSize(); // total bytes eligible for streaming
        int64_t budget = gpuWeightsPercent * streamableSize;        // bytes to keep on GPU
        engine.setWeightStreamingBudgetV2(budget);                  // pass budget to TensorRT
    }
}`}</code></pre>
            <p>
                This is called immediately after the engine is deserialised inside <code>TllmRuntime</code>&rsquo;s
                constructor, before any execution contexts are created:
            </p>
            <pre><code className="language-cpp">{`// cpp/tensorrt_llm/runtime/tllmRuntime.cpp
mEngine.reset(mRuntime->deserializeCudaEngine(...));
setWeightStreaming(getEngine(), gpuWeightsPercent);`}</code></pre>
            <p>The equivalent Python path in <code>session.py</code> uses the Python bindings to the same TensorRT API:</p>
            <pre><code className="language-python">{`# tensorrt_llm/runtime/session.py
def _set_weight_streaming(self, gpu_weights_percent):
    max = self.engine.streamable_weights_size        # total streamable bytes
    budget = int(gpu_weights_percent * max)
    self.engine.weight_streaming_budget_v2 = budget  # TensorRT property setter`}</code></pre>

            <p>
                <code>setWeightStreamingBudgetV2</code> / <code>weight_streaming_budget_v2</code> are TensorRT SDK
                APIs (closed-source, in <code>libnvinfer.so</code>). Once the budget is set, TensorRT manages the
                streaming transparently inside each call to <code>executeContext()</code>:
            </p>
            <ol>
                <li>Before a layer executes, TRT checks whether its weights are currently in GPU memory.</li>
                <li>If not, it transfers them from the pinned CPU buffer over PCIe.</li>
                <li>
                    After the layer completes, if the GPU budget is exhausted, TRT may evict weights for other layers
                    back to CPU to make room.
                </li>
            </ol>
            <p>
                The <code>gpuWeightsPercent = 0.0</code> extreme means <em>all</em> streamable weights are kept on
                CPU and transferred just-in-time; <code>gpuWeightsPercent = 1.0</code> (the default) disables
                streaming entirely &mdash; all weights remain on GPU as normal.
            </p>

            <ul>
                <li>
                    Requires <code>--gemm_plugin disable</code> at build time. Weight Streaming only supports native
                    (non-plugin) weight tensors; TensorRT plugin-managed weights cannot be streamed.
                </li>
                <li>This is a TensorRT-backend feature. It is not available for the PyTorch backend.</li>
            </ul>

            <pre><code className="language-bash">{`# 1. Build the engine with weight streaming enabled
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
    --gpu_weights_percent 0.2`}</code></pre>

            <pre><code className="language-cpp">{`#include "tensorrt_llm/executor/executor.h"

namespace tle = tensorrt_llm::executor;

// Keep 50% of streamable weights on GPU
auto executorConfig = tle::ExecutorConfig(/*gpuWeightsPercent=*/0.5f);
auto executor = tle::Executor(
    "model_path",
    tle::ModelType::kDECODER_ONLY,
    executorConfig
);`}</code></pre>
            <p>
                <code>ExecutorConfig</code> also provides <code>setGpuWeightsPercent(float)</code> and{' '}
                <code>getGpuWeightsPercent()</code> for programmatic configuration after construction.
            </p>

            <h2>HuggingFace Accelerate</h2>
            <p>
                HuggingFace Accelerate implements the same concept in pure Python for arbitrary PyTorch models,
                without requiring a specially compiled engine. Understanding it makes TRT-LLM&rsquo;s approach clearer
                by contrast.
            </p>

            <p>
                Accelerate uses <code>AlignDevicesHook</code> with <code>offload=True</code>, attached to each module
                via <code>add_hook_to_module</code>, which monkey-patches <code>module.forward</code> to inject
                load/evict calls around the original forward:
            </p>
            <pre><code className="language-python">{`# accelerate/hooks.py — patched forward installed by add_hook_to_module
def new_forward(module, *args, **kwargs):
    args, kwargs = module._hf_hook.pre_forward(module, *args, **kwargs)  # 1. load weights
    output = module._old_forward(*args, **kwargs)                         # 2. run layer
    return module._hf_hook.post_forward(module, output)                  # 3. evict weights`}</code></pre>
            <p>
                <strong>Setup (<code>init_hook</code>)</strong> &mdash; weight data is copied to CPU and the
                module&rsquo;s parameters are replaced with zero-byte <code>meta</code> tensors so they occupy no
                device memory:
            </p>
            <pre><code className="language-python">{`# accelerate/hooks.py — AlignDevicesHook.init_hook
self.weights_map = {
    name: param.to("cpu")
    for name, param in named_module_tensors(module, ...)
}
# Replace every tensor with a meta (placeholder) tensor — zero GPU/CPU memory used
for name, _ in named_module_tensors(module, ...):
    set_module_tensor_to_device(module, name, "meta")`}</code></pre>
            <p>
                <strong>Before each layer (<code>pre_forward</code>)</strong> &mdash; real tensors are fetched from{' '}
                <code>weights_map</code> and materialised on the execution device (GPU) just before{' '}
                <code>forward</code> runs:
            </p>
            <pre><code className="language-python">{`# accelerate/hooks.py — AlignDevicesHook.pre_forward
for name, _ in named_module_tensors(module, ...):
    value = self.weights_map[name]  # real data from CPU (or disk, if using disk offload)
    set_module_tensor_to_device(module, name, self.execution_device, value=value)`}</code></pre>
            <p>
                <strong>After each layer (<code>post_forward</code>)</strong> &mdash; weights are immediately evicted
                back to <code>meta</code>, freeing GPU VRAM before the next layer loads:
            </p>
            <pre><code className="language-python">{`# accelerate/hooks.py — AlignDevicesHook.post_forward
for name, _ in named_module_tensors(module, ...):
    set_module_tensor_to_device(module, name, "meta")`}</code></pre>
            <p>
                <code>weights_map</code> can be a plain dict (CPU RAM offload) or a lazy map backed by memory-mapped
                safetensors files (disk offload), enabling models far larger than system RAM.
            </p>

            <h3>TRT-LLM vs. Accelerate</h3>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>TRT-LLM</th>
                        <th>HuggingFace Accelerate</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Granularity</strong></td>
                        <td>Budget in bytes; TRT decides which weights to evict</td>
                        <td>Per-module (all weights of a module move together)</td>
                    </tr>
                    <tr>
                        <td><strong>Who manages movement</strong></td>
                        <td>TensorRT internals (<code>libnvinfer.so</code>)</td>
                        <td>Python hooks around <code>module.forward</code></td>
                    </tr>
                    <tr>
                        <td><strong>Overhead</strong></td>
                        <td>Minimal &mdash; managed inside CUDA execution pipeline</td>
                        <td>Python-level overhead per layer call</td>
                    </tr>
                    <tr>
                        <td><strong>Flexibility</strong></td>
                        <td>Requires TensorRT engine with <code>WEIGHT_STREAMING</code> flag</td>
                        <td>Works on any <code>nn.Module</code> without recompilation</td>
                    </tr>
                    <tr>
                        <td><strong>Storage source</strong></td>
                        <td>Pinned CPU RAM only</td>
                        <td>CPU RAM or memory-mapped disk (safetensors)</td>
                    </tr>
                    <tr>
                        <td><strong>Tied weights</strong></td>
                        <td>Handled by TRT internally</td>
                        <td>Tracked explicitly via <code>tied_params_map</code> to avoid duplication</td>
                    </tr>
                </tbody>
            </table>
            <br></br>
            <h2>Tuning</h2>
            <p><code>gpu_weights_percent</code> is a continuous knob between <code>0.0</code> and <code>1.0</code>:</p>
            <table>
                <thead>
                    <tr>
                        <th>Value</th>
                        <th>Effect</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>1.0</code> (default)</td>
                        <td>No streaming &mdash; all weights on GPU, full throughput</td>
                    </tr>
                    <tr>
                        <td><code>0.5</code></td>
                        <td>Half streaming &mdash; moderate memory savings, some latency increase</td>
                    </tr>
                    <tr>
                        <td><code>0.0</code></td>
                        <td>Maximum streaming &mdash; minimum GPU memory, maximum latency overhead</td>
                    </tr>
                </tbody>
            </table>
            <p>
                Start from <code>1.0</code> and decrease until the engine fits within the available GPU memory
                budget. PCIe bandwidth (typically 16&ndash;32 GB/s) is the bottleneck when streaming is active, so
                very low values will significantly reduce throughput on bandwidth-bound workloads.
            </p>
        </div>
    );
}