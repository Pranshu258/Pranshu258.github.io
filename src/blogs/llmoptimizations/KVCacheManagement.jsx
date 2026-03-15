import React, { useEffect } from 'react';
import kvcDiagram1Svg from './kvc-diagram1.svg?raw';
import kvcDiagram4Svg from './kvc-diagram4.svg?raw';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-bash';
import '../../styles/prism.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { SiNvidia } from 'react-icons/si';

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
            className="mermaid-diagram"
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
                TensorRT-LLM&rsquo;s KV cache is built around a simple idea: rather than allocating one giant contiguous tensor per request, memory is chopped into fixed-size <strong>blocks</strong>, each holding the KV state for a fixed number of tokens across all layers. Blocks are handed out on demand and returned to a pool when no longer needed &mdash; much like pages in a virtual memory system. This makes it possible to serve many requests of wildly different lengths without wasting GPU memory on worst-case padding.
            </p>
            <h3>Cache Reuse</h3>
            <p>
                Blocks containing KV state computed for previous requests are stored in a radix search tree as soon as they are filled. When a new request comes in, a search is performed and matched blocks are reused instead of recalculated.
            </p>
            <p>
                Blocks remain usable until they are evicted from the search tree. Eviction happens only when a new (empty) block is needed.  blocks are assigned a priority between 0 and 100 (100 being most important). All blocks of the lowest priority must be evicted before any blocks of the next priority can be evicted. If all blocks have the same priority, the least recently used block is evicted.
            </p>
            <h3>Block Lifecycle</h3>
            <div>
                <p>
                    A block moves through a well-defined set of states over its lifetime. It starts in the <strong>FREE</strong> state, sitting in the LRU queue with no references. Once it is claimed by a sequence, it transitions to <strong>ALLOCATED</strong>, where a sequence writes KV data into its GPU pool row during prefill. Once prefill completes, it is linked into the prefix tree &mdash; the block is now <strong>CACHED</strong> and available for reuse.
                </p>
                <p>
                    When a second request matches this block in the trie, its reference count is bumped above one and the block becomes <strong>SHARED</strong> &mdash; read-only and ineligible for eviction until all holders release it. If an incoming request only partially matches a cached block (some tokens match but not the full block), and copy on partial reuse is enabled, the system forks and allocates a new block and copies the matching portion over; otherwise it steals the leaf outright, unlinking it from the tree.
                </p>
                <p>
                    Under memory pressure, a cached block can be <strong>offloaded</strong> &mdash; its content is asynchronously copied from GPU memory to pinned CPU memory and the GPU slot is freed. It stays in the trie the whole time, so from the outside it still looks like a valid cache entry. If a subsequent request hits it, it is streamed back to GPU before the request proceeds. When all references drop to zero and the LRU timer expires, the block is unlinked from the tree and returns it to the FREE pool.
                </p>
                <MermaidDiagram svg={kvcDiagram4Svg} />
            </div>
            <h3>Cache Salting</h3>
            <p>
                KV cache salting provides a security mechanism to control which requests can reuse cached KV states. When a `cache_salt` parameter is provided with a request, the KV cache system will only allow reuse of cached blocks given the same cache salt value. This prevents potential security issues such as prompt theft attacks, where malicious users might try to infer information from cached states of other users' requests.
            </p>
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
                        href="https://github.com/NVIDIA/TensorRT-LLM/blob/main/docs/source/features/kvcache.md">
                        TensorRT LLM - KV Cache System
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