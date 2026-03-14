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
            <h3>Overview</h3>
            <p>
                The entry point is the <code>LLM</code> Python API, which accepts a <code>KvCacheConfig</code> &mdash; a flat struct carrying knobs like <code>freeGpuMemoryFraction</code>, <code>maxTokens</code>, <code>enableBlockReuse</code>, and <code>hostCacheSize</code>. That config initialises the <strong><code>KVCacheManager</code></strong>, the central coordinator. It doesn&rsquo;t manage a single monolithic pool. Instead, it fans out into one <strong><code>WindowBlockManager</code></strong> per distinct <code>(numKvHeads, windowSize)</code> combination &mdash; so a model using sliding-window attention on some layers gets a completely separate manager from the layers using full context, each with its own independently sized pool.
            </p>
            <p>
                Each <code>WindowBlockManager</code> owns one of two raw storage layouts. The <strong>paged path</strong> uses a <code>KVBlockArray</code> &mdash; an index table dimensioned by batch size, number of windows, keys-vs-values (always 2), and the maximum number of blocks a single sequence can occupy. It hands out pointers to individual blocks on demand via <code>getKBlockPtr</code> and <code>getVBlockPtr</code>. The <strong>contiguous path</strong> uses a <code>KVLinearBuffer</code> &mdash; one large flat tensor covering all batches, both keys and values, all attention heads, the full sequence length, and the per-head embedding dimension. It is suited to short fixed-length sequences where fragmentation isn&rsquo;t a concern. Both layouts back onto the same pre-allocated GPU primary pool. When memory is under pressure, blocks are copied out to pinned CPU memory, but they stay in the reuse tree &mdash; a cache hit on an offloaded block triggers an async transfer back to GPU rather than a full recompute.
            </p>
            <MermaidDiagram svg={kvcDiagram1Svg} />
            <h3>Inside a WindowBlockManager</h3>
            <p>
                Each <code>WindowBlockManager</code> is where all the interesting scheduling happens. It wires together five components that work in concert:
            </p>
            <ul>
                <li>
                    <strong>PrefixReuseTree</strong> &mdash; a radix trie rooted at a sentinel node. Every fully-written block that finishes prefill gets inserted here, keyed by its token fingerprint. New requests walk the trie to find the longest matching prefix and skip recomputing those tokens entirely.
                </li>
                <li>
                    <strong>KVCacheBlockPool</strong> &mdash; the actual GPU (and optionally CPU) tensors. One pool per cache tier, each backed by a large pre-allocated tensor with axes for the total block count, number of transformer layers, keys vs. values (always 2), number of attention heads, tokens per block, and the per-head embedding dimension.
                </li>
                <li>
                    <strong>LRUEvictionPolicy</strong> &mdash; when the pool is full and a new block is needed, the eviction policy selects the best candidate to recycle. Blocks carry a priority (0&ndash;100) and an optional expiry duration, so hot system-prompt prefixes can be pinned while ephemeral user context is evicted first.
                </li>
                <li>
                    <strong>KVCacheTransferManager</strong> &mdash; handles async memory transfers between GPU and CPU. It is invoked either when memory pressure demands offloading a block to CPU, or when a cache hit lands on a block that was previously offloaded and needs to be streamed back.
                </li>
                <li>
                    <strong>mAllBlocksById</strong> &mdash; a flat vector of all block pointers indexed by block ID, enabling O(1) lookup without touching the trie.
                </li>
            </ul>
            <h3>Prefix Caching with Radix Tree</h3>
            <p>
                The reuse tree is a radix trie where every node <em>is</em> a <code>KVCacheBlock</code>. A block is a metadata-only object &mdash; it holds no raw tensor data itself, just a row index (<code>mMemoryPoolBlockIndex</code>) into the GPU pool tensor where its KV data actually lives.
            </p>
            <p>
                The label on each tree edge is a <strong><code>BlockKey</code></strong>: a struct combining the token IDs the block covers, an optional LoRA adapter ID, an optional tenant salt, and optional multimodal content hashes. Two requests only share a block if their <code>BlockKey</code> matches exactly &mdash; different adapters or different tenants are silently routed into separate subtrees, providing isolation with no extra allocation overhead.
            </p>
            <p>
                Each block also carries a <strong>Merkle-chained hash</strong>: its hash is seeded with its parent&rsquo;s hash, so a single comparison at the leaf verifies the entire prefix path without re-hashing every ancestor. This is what makes cache lookups fast even for very long shared prefixes.
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
                        <td>This node&rsquo;s own key (its token fingerprint)</td>
                    </tr>
                    <tr>
                        <td><code>BlockPtr</code></td>
                        <td><code>mPrevBlock</code></td>
                        <td>Parent in the reuse tree (<code>nullptr</code> = not in tree)</td>
                    </tr>
                    <tr>
                        <td><code>BlockPtr</code></td>
                        <td><code>mPrevBlockInSeq</code></td>
                        <td>Parent in this request&rsquo;s sequence chain</td>
                    </tr>
                    <tr>
                        <td><code>NextBlockMap</code></td>
                        <td><code>mNextBlocks</code></td>
                        <td>Children: map from <code>BlockKey</code> &rarr; child block</td>
                    </tr>
                    <tr>
                        <td><code>bool</code></td>
                        <td><code>mIsFull</code></td>
                        <td>Whether all <code>tokensPerBlock</code> slots are written</td>
                    </tr>
                    <tr>
                        <td><code>size_t</code></td>
                        <td><code>mHash</code></td>
                        <td>Merkle-chained hash of this block&rsquo;s position</td>
                    </tr>
                </tbody>
            </table>
            <h3>Block Lifecycle</h3>
            <p>
                A block moves through a well-defined set of states over its lifetime. It starts in the <strong>FREE</strong> state, sitting in the LRU queue with no references. <code>getFreeBlock()</code> claims it and transitions it to <strong>ALLOCATED</strong>, where a sequence writes KV data into its GPU pool row during prefill. Once prefill completes, <code>storeBlocks()</code> links it into the prefix tree &mdash; the block is now <strong>CACHED</strong> and available for reuse.
            </p>
            <p>
                When a second request matches this block in the trie, <code>claimBlock()</code> bumps its reference count above one and the block becomes <strong>SHARED</strong> &mdash; read-only and ineligible for eviction until all holders release it. If an incoming request only partially matches a cached block (some tokens match but not the full block), the system forks: with <code>mCopyOnPartialReuse</code> enabled it allocates a new block and copies the matching portion over; otherwise it steals the leaf outright, unlinking it from the tree.
            </p>
            <p>
                Under memory pressure, a cached block can be <strong>offloaded</strong> &mdash; its content is asynchronously copied from GPU memory to pinned CPU memory and the GPU slot is freed. It stays in the trie the whole time, so from the outside it still looks like a valid cache entry. If a subsequent request hits it, <code>onboard()</code> streams it back to GPU before the request proceeds. When all references drop to zero and the LRU timer expires, <code>freeLeafBlock()</code> unlinks the block from the tree and returns it to the FREE pool.
            </p>
            <MermaidDiagram svg={kvcDiagram4Svg} />
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