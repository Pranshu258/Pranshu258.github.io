import React, { useEffect } from 'react';
import { SiNvidia, SiHuggingface, SiGoogle, SiGooglegemini } from 'react-icons/si';
import offloadFlowSvg from './offload-chart.svg?raw';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-bash';
import '../../styles/prism.css';

function MermaidDiagram({ svg }) {
    return (
        <div
            className="mermaid-diagram"
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ overflowX: 'auto', margin: '1.5rem 0', display: 'flex', justifyContent: 'center', borderRadius: '0.5rem', padding: '1rem' }}
        />
    );
}

export default function ModelQuantization() {
    useEffect(() => {
        Prism.highlightAll();
    }, []);
    return (
        <div>
            <p>
                Quantization reduces the numerical precision of model weights and/or activations to enable efficient deployment of large language models by trading off precision with memory usage. Instead of representing each number with 32 or 16 bits, we use 8 or even 4 bits. Less precision, smaller models, faster inference - all while maintaining surprisingly good quality.
            </p>
            <p>
                The most immediate benefit is memory savings. Modern LLMs are memory hogs. Take LLama 2 70B for example - in FP16 format requires 140 GB of memory. That's nearly 2 NVIDIA A100 80GB GPUs. With FP8 quantization - it only needs 70 GB, fitting comfortably on a single GPU. That's an instant 50% infrastructure cost reduction.
            </p>
            <p>
                Lower precision means - fewer bits to move through memory, faster matrix multiplications and, more requests per second from the same hardware. On modern hardware like the H100, FP8 quantization delivers up to 1.6x speedup compared to FP16. That's 60% more throughput without buying a single extra GPU.
            </p>
            <h2>Methods of Quantization</h2>
            <p>
                There are several quantization methods that are used in the industry with different levels of hardware and library support. For example, vLLM supports these methods:
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Description</th>
                        <th>Hardware</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>AWQ</td>
                        <td>4-bit weight quantization</td>
                        <td>Turing+ GPUs</td>
                    </tr>
                    <tr>
                        <td>GPTQ</td>
                        <td>Group-wise quantization</td>
                        <td>All NVIDIA GPUs</td>
                    </tr>
                    <tr>
                        <td>FP8 (W8A8)</td>
                        <td>8-bit floating point for weights & activations</td>
                        <td>Ada/Hopper GPUs, AMD MI300x</td>
                    </tr>
                    <tr>
                        <td>INT8 (W8A8)</td>
                        <td>8-bit integer</td>
                        <td>Turing+ GPUs, CPUs</td>
                    </tr>
                    <tr>
                        <td>INT4</td>
                        <td>4-bit integer</td>
                        <td>Various</td>
                    </tr>
                    <tr>
                        <td>Marlin</td>
                        <td>Optimized kernels for GPTQ/AWQ/FP8</td>
                        <td>Turing+ (fast)</td>
                    </tr>
                    <tr>
                        <td>BitsAndBytes</td>
                        <td>Dynamic quantization</td>
                        <td>NVIDIA GPUs</td>
                    </tr>
                    <tr>
                        <td>GGUF</td>
                        <td>llama.cpp format</td>
                        <td>NVIDIA/AMD GPUs</td>
                    </tr>
                    <tr>
                        <td>TorchAO</td>
                        <td>PyTorch native quantization</td>
                        <td>Various</td>
                    </tr>
                    <tr>
                        <td>Quantized KV Cache</td>
                        <td>Compress KV cache memory</td>
                        <td>Various</td>
                    </tr>
                </tbody>
            </table>
            <h2><SiGooglegemini style={{ verticalAlign: 'middle', marginRight: '0.4em', marginBottom: '0.1em' }} />Google TurboQuant</h2>
        </div>
    );
}