import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-bash';
import '../../styles/prism.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { SiNvidia, SiHuggingface } from 'react-icons/si';

function Eq({ tex, display = false }) {
    return (
        <span
            dangerouslySetInnerHTML={{
                __html: katex.renderToString(tex, { displayMode: display, throwOnError: false })
            }}
        />
    );
}

function MermaidDiagram({ svg }) {
    return (
        <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ overflowX: 'auto', margin: '1.5rem 0', display: 'flex', justifyContent: 'center', borderRadius: '0.5rem', padding: '1rem' }}
        />
    );
}

export default function WeightStreaming() {
    useEffect(() => {
        Prism.highlightAll();
    }, []);
    return (
        <div>
            <p>
                Transformers generate text one token at a time. At each step, the model computes an attention score between the new token and every token that came before it &mdash; and that requires the <strong>key</strong> and <strong>value</strong> projections of all prior tokens. Without caching, those projections are recomputed from scratch on every step, making generation quadratic in sequence length. The KV cache eliminates this redundancy: projections are computed once and stored, so each new step only needs to produce one additional row and append it to the cache.
            </p>
            <div className="llm-callout">
                <p>
                    Concretely, the scaled dot-product attention at decode step <Eq tex="t" /> is:
                </p>
                <Eq display={true} tex={String.raw`\text{Attention}(\mathbf{q}_t,\, K_{1:t},\, V_{1:t}) = \text{softmax}\!\left(\frac{\mathbf{q}_t \, K_{1:t}^{\top}}{\sqrt{d_k}}\right) V_{1:t}`} />
                <p>
                    Here <Eq tex="\mathbf{q}_t" /> is the query for the current token, while <Eq tex="K_{1:t}" /> and <Eq tex="V_{1:t}" /> are matrices whose rows are the keys and values of all tokens up to and including step <Eq tex="t" />. The factor <Eq tex="\sqrt{d_k}" /> keeps the dot products from growing too large as dimension increases. With a KV cache, <Eq tex="K_{1:t-1}" /> and <Eq tex="V_{1:t-1}" /> are already in memory; only the new rows <Eq tex="\mathbf{k}_t" /> and <Eq tex="\mathbf{v}_t" /> need to be computed and appended.
                </p>
            </div>
            <p>
                The cost is memory. Every cached token consumes <code>2 &times; num_layers &times; num_kv_heads &times; head_dim &times; sizeof(dtype)</code> bytes, and that footprint scales with both batch size and sequence length. For a large model serving long contexts, the cache alone can occupy several gigabytes of VRAM. Managing it carefully &mdash; what to keep, at what precision, and where to store it &mdash; is one of the central levers for maximising inference throughput.
            </p>
            <h2><SiNvidia style={{ verticalAlign: 'middle', marginRight: '0.4em', marginBottom: '0.1em' }} />Nvidia TensorRT-LLM</h2>
            <p>
                In TensorRT-LLM, KV cache memory is split into fixed-sized blocks. Each block holds KV state for a fixed number of tokens across all layers. Notable features include:
            </p>
            <ul>
                <li>
                    <strong>Cross Request Reuse</strong> &mdash; As blocks fill up, they are inserted into a <code>radix search tree</code> keyed by their token content hash. New requests search this tree, and matching prefix blocks are reused rather than recomputed.
                </li>
                <li>
                    <strong>Partial Reuse</strong> &mdash; If only some tokens in a block match, a copy is made and partially reused.
                </li>
                <li>
                    <strong>Cache Isolation</strong> &mdash; Requests can be assigned a salt so that only requests sharing the same salt can exchange blocks.
                </li>
                <li>
                    <strong>Host Offloading</strong> &mdash; When a GPU block is about to be evicted, it can be offloaded to CPU host memory. The block remains in the radix tree and stays usable; on a cache hit, it is copied back to GPU on demand.
                </li>
                <li>
                    <strong>Quantization</strong> &mdash; INT8 and FP8 formats are supported. Tensors are quantized on write and dequantized on the fly inside the multi-head-attention (MHA) kernel during the forward pass.
                </li>
            </ul>
            <h2>Prefix Caching with Radix Tree</h2>
            <p>
                Each block is a node in the radix tree, and has two maps embedded in it.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Field</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>BlockKey</code></td>
                        <td><code>mBlockKey</code></td>
                        <td>This node's own key (its token fingerprint)</td>
                    </tr>
                    <tr>
                        <td><code>BlockPtr</code></td>
                        <td><code>mPrevBlock</code></td>
                        <td>Parent in the reuse tree (<code>nullptr</code> = not in tree)</td>
                    </tr>
                    <tr>
                        <td><code>BlockPtr</code></td>
                        <td><code>mPrevBlockInSeq</code></td>
                        <td>Parent in this request's sequence chain</td>
                    </tr>
                    <tr>
                        <td><code>NextBlockMap</code></td>
                        <td><code>mNextBlocks</code></td>
                        <td>Children: map from <code>BlockKey</code> → child block</td>
                    </tr>
                    <tr>
                        <td><code>bool</code></td>
                        <td><code>mIsFull</code></td>
                        <td>Whether all <code>tokensPerBlock</code> slots are written</td>
                    </tr>
                    <tr>
                        <td><code>size_t</code></td>
                        <td><code>mHash</code></td>
                        <td>Merkle-chained hash of this block's position</td>
                    </tr>
                </tbody>
            </table>
            <hr />
            <h3 className="headings">References</h3>
            <ol>
                <li>
                    <a style={{ textAlign: 'left', fontSize: 'inherit' }}
                        href="https://jalammar.github.io/illustrated-transformer/">
                        The Illustrated Transformer - by Jay Alammar
                    </a>
                </li>
                <li>
                    <a style={{ textAlign: 'left', fontSize: 'inherit' }}
                        href="https://github.com/NVIDIA/TensorRT-LLM/blob/main/docs/source/legacy/advanced/kv-cache-management.md">
                        TensorRT LLM - KV Cache Management: Pools, Blocks, and Events
                    </a>
                </li>
            </ol>
        </div>
    );
}