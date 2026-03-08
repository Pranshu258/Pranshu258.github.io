import React, { useEffect, useRef } from 'react';
import { SiNvidia, SiHuggingface } from 'react-icons/si';
import mermaid from 'mermaid';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-bash';
import '../../styles/prism.css';

mermaid.initialize({ startOnLoad: false, theme: 'base' });

function MermaidDiagram({ chart }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            const id = 'mermaid-' + Math.random().toString(36).slice(2);
            mermaid.render(id, chart).then(({ svg }) => {
                // Force edge label text to be dark regardless of theme lineColor
                const patched = svg.replace(
                    '</style>',
                    '.edgeLabel span, .edgeLabel p, .edgeLabel text, .edgeLabel { color: #1a1a1a !important; fill: #1a1a1a !important; }</style>'
                );
                ref.current.innerHTML = patched;
            });
        }
    }, [chart]);
    return <div ref={ref} style={{ overflowX: 'auto', margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }} />;
}

export default function WeightStreaming() {
    useEffect(() => {
        Prism.highlightAll();
    }, []);
    return (
        <div>
            <p>
                Large language models frequently exceed what a single GPU can hold in VRAM. Model offloading &mdash; also called weight streaming &mdash; addresses this by keeping parameters in a slower, cheaper storage tier (CPU, RAM, or disk) and pulling them onto the accelerator only for the duration of a module&rsquo;s forward pass. Once the forward pass completes, the weights are evicted and the reclaimed memory is available for the next module. The result is the ability to run models whose total parameter count exceeds VRAM, at the cost of added transfer latency.
            </p>
            <h2><SiNvidia style={{ verticalAlign: 'middle', marginRight: '0.4em', marginBottom: '0.1em' }} />Nvidia TensorRT-LLM</h2>
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
                By default, TRT-LLM replaces every
                matrix-multiply (GEMM) with a custom fused CUDA plugin that delivers better throughput by
                tiling and fusing operations at the kernel level. The trade-off is that the plugin owns its
                weight tensors internally — TensorRT has no visibility into them, so they cannot be tagged as
                streamable and are pinned to the GPU regardless of the budget. That is why we need to disable it using <code>--gemm_plugin disable</code> flag.
            </p>
            <p>
                At <strong>runtime</strong>, TRT-LLM converts a user-supplied percentage (0.0–1.0) into an
                absolute byte budget and passes it to TensorRT before any execution contexts are created. The
                C++ and Python paths do exactly the same thing via their respective TensorRT bindings:
            </p>
            <p>
                Setting <code>gpuWeightsPercent = 1.0</code> (the default) disables
                streaming entirely; <code>0.0</code> keeps all streamable weights on CPU and transfers them
                just-in-time.
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
                budget is exhausted. The implementation of streaming mechanism is not open source and lives inside the propreitary TensorRT library. 
            </p>
            <p>
                In the next section, we will look at HuggingFace Accelerate (open source) for streaming internals.
            </p>
            <h2><SiHuggingface style={{ verticalAlign: 'middle', marginRight: '0.4em', marginBottom: '0.1em' }} />HuggingFace Accelerate</h2>
            <div className="llm-callout">
                <p>
                    HuggingFace Accelerate is a lightweight library that makes PyTorch models portable across
                    hardware configurations &mdash; single GPU, multi-GPU, TPU, or CPU &mdash; with minimal code
                    changes. Beyond distributed training, it ships a collection of memory-management utilities:
                    model sharding across devices, mixed-precision helpers, and CPU/disk offloading hooks that
                    work on <em>any</em> PyTorch module without recompilation or a special build step.
                </p>
            </div>
            <p>
                Unlike TRT-LLM&rsquo;s closed-source streaming internals, Accelerate implements model offloading
                entirely in pure Python, making the mechanics fully inspectable. The public API &mdash;{' '}
                <code>cpu_offload</code>, <code>disk_offload</code>, <code>dispatch_model</code> &mdash; sits on
                top of a hook-attachment layer that walks the module tree and configures each layer. The
                streaming engine itself is a class called <code>AlignDevicesHook</code>, backed by a lazy
                mapping object (<code>OffloadedWeightsLoader</code>) that reads from whichever storage tier
                is in use. A low-level utility, <code>set_module_tensor_to_device</code>, performs the
                actual tensor moves, handling edge cases like quantised types and shared weight pointers.
            </p>
            <p>
                For each module that needs to stream its weights, Accelerate silently replaces the module&rsquo;s
                normal <code>forward</code> method with a thin wrapper. The wrapper runs three steps in
                sequence: load, compute, evict. The original forward logic is preserved and called unchanged
                in the middle &mdash; the module itself has no idea any of this is happening.
            </p>
            <MermaidDiagram chart={`%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1e1e2e', 'primaryTextColor': '#cdd6f4', 'primaryBorderColor': '#45475a', 'lineColor': '#6b7fa3', 'secondaryColor': '#181825', 'tertiaryColor': '#1e1e2e', 'background': '#f9f6ee', 'mainBkg': '#1e1e2e', 'nodeBorder': '#45475a', 'clusterBkg': '#181825', 'titleColor': '#cdd6f4', 'edgeLabelBackground': '#f9f6ee', 'attributeBackgroundColorEven': '#1e1e2e', 'attributeBackgroundColorOdd': '#181825'}}}%%
flowchart TD
    A([▶ Start Inference]):::start --> B[Select next layer]:::gpu

    B --> C{Weights in\nGPU memory?}:::decision
    C -- Yes --> E[Run layer\nforward pass]:::gpu
    C -- No --> F[/Transfer weights\nover PCIe/]:::transfer

    D[(CPU RAM / mmap\nsafetensors)]:::cpu
    D -- pre_forward: fetch --> F
    F --> E

    E --> G{Budget\nexceeded?}:::decision
    G -- Yes --> H[Evict LRU weights\nback to meta]:::evict
    H --> I{More layers?}:::decision
    G -- No --> I

    I -- Yes --> B
    I -- No --> J([◼ Output tokens]):::finish

    classDef start    fill:#313244,stroke:#89b4fa,color:#89b4fa,stroke-width:2px
    classDef finish   fill:#313244,stroke:#a6e3a1,color:#a6e3a1,stroke-width:2px
    classDef gpu      fill:#1e3a5f,stroke:#89b4fa,color:#cdd6f4,stroke-width:1.5px
    classDef cpu      fill:#1a3a2a,stroke:#a6e3a1,color:#cdd6f4,stroke-width:1.5px
    classDef transfer fill:#3a2a00,stroke:#f9e2af,color:#f9e2af,stroke-width:1.5px
    classDef evict    fill:#3a1a1a,stroke:#f38ba8,color:#f38ba8,stroke-width:1.5px
    classDef decision fill:#2a1f3d,stroke:#cba6f7,color:#cdd6f4,stroke-width:1.5px`} />
            <p>
                There are three phases to the hook lifecycle:
            </p>
            <ol>
                <li>
                    <strong>Initialisation</strong> &mdash; when a hook is first attached, all of the
                    module&rsquo;s parameters are snapshotted and the live tensors are replaced with{' '}
                    <em>meta</em> placeholders. A meta tensor is a ghost: it carries the right shape and
                    data type, but has no backing memory. In its idle state an offloaded module occupies
                    essentially zero VRAM.
                </li>
                <li>
                    <strong>Pre-forward</strong> &mdash; just before the module runs, the hook fetches
                    each weight from the store and copies it onto the GPU, replacing the meta placeholder.
                    Input tensors are moved to the same device. At this point the module has everything it
                    needs to execute.
                </li>
                <li>
                    <strong>Post-forward</strong> &mdash; immediately after the forward returns, every
                    parameter is swapped back to a meta placeholder and the GPU memory is released.
                </li>
            </ol>
            <p>
                The weight store is a lazy mapping object that never loads a tensor until it is actually
                requested. It supports three storage tiers, searched in priority order:
            </p>
            <ul>
                <li>
                    <strong>In-memory dictionary</strong> &mdash; weights held as plain CPU tensors in a
                    Python dict. Fast to read back, but still occupies CPU RAM. This is what{' '}
                    <code>cpu_offload()</code> uses.
                </li>
                <li>
                    <strong>Safetensors files</strong> &mdash; weights loaded on demand from{' '}
                    <code>.safetensors</code> files on disk. The file format allows reading individual
                    tensors without de-serialising the whole checkpoint, so only the weights for the layer
                    currently executing need to be read at any given moment.
                </li>
                <li>
                    <strong>Memory-mapped numpy files</strong> &mdash; weights stored as raw binary{' '}
                    <code>.dat</code> files on disk, accessed via OS memory-mapping. The OS streams pages
                    on demand without ever loading the full file into RAM. This is the backing store used by{' '}
                    <code>disk_offload()</code>, and makes it possible to run models far larger than
                    available system RAM.
                </li>
            </ul>
            <p>
                When a module&rsquo;s weights are spread across a deep tree of submodules, each sub-hook
                receives a <em>prefixed view</em> of the global store so it can look up{' '}
                <code>"weight"</code> while the backing store transparently maps that to the fully qualified
                path like <code>"transformer.h.3.mlp.weight"</code>.
            </p>

            <h3>The Public API</h3>
            <p>
                Accelerate exposes all of this through four entry points. <code>cpu_offload()</code>{' '}
                streams every module through CPU RAM. <code>disk_offload()</code> first serialises the
                weights to a directory as memory-mapped files, then streams from there &mdash; useful when
                the model doesn&rsquo;t fit in RAM. <code>dispatch_model()</code> is the most flexible:
                it accepts a per-layer device map so some layers can sit resident on GPU while others
                stream from RAM or disk simultaneously:
            </p>
            <pre><code className="language-python">{`from accelerate import dispatch_model

device_map = {
    "transformer.embed_tokens": "cuda:0",
    "transformer.h.0":          "cuda:0",  # always resident on GPU
    "transformer.h.1":          "cpu",     # streamed from CPU RAM
    "transformer.h.2":          "disk",    # streamed from disk
    "lm_head":                  "cuda:0",
}
model = dispatch_model(model, device_map=device_map)`}</code></pre>
            <p>
                Finally, <code>load_checkpoint_and_dispatch()</code> combines loading with dispatch, so
                weights land directly in their target storage tier without ever materialising the full
                model in RAM.
            </p>
        </div>
    );
}