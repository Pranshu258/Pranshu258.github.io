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
            <div className="llm-callout">
                <p>
                    TensorRT-LLM is NVIDIA&rsquo;s open-source library for optimising LLM inference on NVIDIA GPUs.
                    It wraps TensorRT to auto-generate fused CUDA kernels, supports tensor and pipeline parallelism,
                    and exposes high-level Python APIs for compiling a model checkpoint into a serialised inference
                    engine. The compiled engine is hardware-specific and version-locked, but in return delivers
                    near-peak GPU throughput with first-class support for quantisation, paged KV-caches, and
                    in-flight batching.
                </p>
            </div>
            <p>
                In TensorRT-LLM, weight streaming is a two-phase mechanism: a build-time flag and a runtime
                budget.
            </p>
            <p>
                At <strong>build time</strong>, the <code>WEIGHT_STREAMING</code> builder flag is set. This causes TensorRT to annotate eligible weight
                tensors in the serialised engine as streamable and record their total byte size. Weights belonging
                to plugin layers are ineligible and always stay resident on the GPU. The flag is exposed as a
                simple boolean field on <code>BuildConfig</code>.
            </p>
            <p>
                At <strong>runtime</strong>, TRT-LLM converts a user-supplied percentage (0.0–1.0) into an
                absolute byte budget and passes it to TensorRT before any execution contexts are created. The
                C++ and Python paths do exactly the same thing via their respective TensorRT bindings:
            </p>
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
    --gpu_weights_percent 0.2`}
            </code></pre>
            <br></br>
            <p>
                Once the budget is set, TensorRT manages streaming transparently, before each layer it checks whether its weights are in GPU memory, if not, it
                transfers them from pinned CPU RAM over PCIe, and evicts weights from other layers if the
                budget is exhausted.
            </p>
            <p>
                Setting <code>gpuWeightsPercent = 1.0</code> (the default) disables
                streaming entirely; <code>0.0</code> keeps all streamable weights on CPU and transfers them
                just-in-time.
            </p>
            <p>
                By default, TRT-LLM replaces every
                matrix-multiply (GEMM) with a custom fused CUDA plugin that delivers better throughput by
                tiling and fusing operations at the kernel level. The trade-off is that the plugin owns its
                weight tensors internally — TensorRT has no visibility into them, so they cannot be tagged as
                streamable and are pinned to the GPU regardless of the budget. That is why we need to disable it using <code>--gemm_plugin disable</code> flag.
            </p>
            <h2>HuggingFace Accelerate</h2>
            <div className="llm-callout">
                <p>
                    HuggingFace Accelerate is a lightweight library that makes PyTorch models portable across
                    hardware configurations &mdash; single GPU, multi-GPU, TPU, or CPU &mdash; with minimal code
                    changes. Beyond distributed training, it ships a collection of memory-management utilities:
                    model sharding across devices, mixed-precision helpers, and CPU/disk offloading hooks that
                    work on <em>any</em> <code>nn.Module</code> without recompilation or a special build step.
                </p>
            </div>
            <p>
                HuggingFace Accelerate implements the weight streaming in pure Python for arbitrary PyTorch models,
                without requiring a specially compiled engine, which makes the mechanics easier to follow than
                TRT-LLM&rsquo;s closed-source internals.
            </p>
            <p>
                Accelerate attaches an <code>AlignDevicesHook</code> (with <code>offload=True</code>) to each
                module via <code>add_hook_to_module</code>, which monkey-patches <code>module.forward</code> to
                wrap the original call with load and evict steps:
            </p>
            <pre><code className="language-python">{`# accelerate/hooks.py — patched forward installed by add_hook_to_module
def new_forward(module, *args, **kwargs):
    args, kwargs = module._hf_hook.pre_forward(module, *args, **kwargs)  # 1. load weights
    output = module._old_forward(*args, **kwargs)                         # 2. run layer
    return module._hf_hook.post_forward(module, output)                  # 3. evict weights`}</code></pre>

            <p>The three phases of the hook lifecycle are:</p>
            <ol>
                <li>
                    <strong>Setup (<code>init_hook</code>)</strong> &mdash; each parameter is copied to CPU and
                    the module&rsquo;s tensors are replaced with zero-size <code>meta</code> placeholders, so
                    neither GPU nor CPU memory is held during idle periods.
                </li>
                <li>
                    <strong>Pre-forward</strong> &mdash; real tensors are fetched from <code>weights_map</code>{' '}
                    and materialised on the GPU just before <code>forward</code> runs.
                </li>
                <li>
                    <strong>Post-forward</strong> &mdash; weights are immediately swapped back to{' '}
                    <code>meta</code> tensors, freeing GPU VRAM before the next layer loads.
                </li>
            </ol>
            <pre><code className="language-python">{`# accelerate/hooks.py

# init_hook — snapshot weights to CPU, replace live tensors with meta placeholders
self.weights_map = {name: param.to("cpu") for name, param in named_module_tensors(module, ...)}
for name, _ in named_module_tensors(module, ...):
    set_module_tensor_to_device(module, name, "meta")

# pre_forward — materialise weights on GPU just before forward()
for name, _ in named_module_tensors(module, ...):
    value = self.weights_map[name]  # CPU RAM, or memory-mapped disk if using disk offload
    set_module_tensor_to_device(module, name, self.execution_device, value=value)

# post_forward — evict back to meta immediately after forward()
for name, _ in named_module_tensors(module, ...):
    set_module_tensor_to_device(module, name, "meta")`}</code></pre>

            <p>
                <code>weights_map</code> can be a plain dict (CPU RAM offload) or a lazy map backed by
                memory-mapped safetensors files (disk offload), enabling models far larger than system RAM.
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