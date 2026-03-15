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
            <h3>Cache Block Pool</h3>
            <div>
                <p>
                    Blocks are organized into pools. Each pool is a contiguous GPU buffer. Layers with the same number of KV heads are grouped under the same pool.
                </p>
                <pre><code className="language-cpp">{`struct KVCacheBlockPool {
    SizeType32 numLayers;      // layers sharing this pool
    SizeType32 kvFactor;       // 2 normally; 1 for DeepSeek (K==V)
    SizeType32 numKvHeads;     // KV head groups
    SizeType32 sizePerHead;    // head dimension
    SizeType32 tokensPerBlock;
    SizeType32 blockSize;      // = numKvHeads * sizePerHead * tokensPerBlock

    runtime::ITensor::SharedPtr primaryPtr;    // GPU (fast) memory
    runtime::ITensor::SharedPtr secondaryPtr;  // CPU (host, pinned) memory for offload

    bool containsBlockScales;     // FP4 has an extra block-scale pool
    bool containsIndexerKCache;
};`}
                </code></pre>
                <br></br>
                <p>
                    When host offloading is enabled, <code>secondaryPtr</code> is allocated in pinned CPU memory. Blocks evicted from GPU are async-copied here via <code>cudaMemcpyAsync</code>. The <code>KVCacheIndex</code> type encodes whether a given block offset refers to primary (GPU) or secondary (CPU) memory, so kernels can distinguish at runtime.
                </p>
                <p>
                    A KVCacheBlock only stores <code>mMemoryPoolBlockIndex</code> (a <code>kernels::KVCacheIndex</code>) which is an index into those pool tensors. The pools are large pre-allocated tensors of shape <code>[max_blocks, num_layers, 2, num_kv_heads, tokens_per_block, head_size]</code>. Multiple blocks share the same pool arrays — each block occupies one slot identified by its <code>mMemoryPoolBlockIndex</code>.
                </p>
                <p>
                    Some of the noteworthy properties from the cache block class are shown below: 
                </p>
                <pre><code className="language-cpp">{`// Basic building block of a paged KV cache - a single
// cache block. This class just holds metadata, no pointers
// since it is reused across all layers.
class KVCacheBlock {
    IdType mBlockId;                              // Linear ID of block independent of pool
    kernels::KVCacheIndex mMemoryPoolBlockIndex;  // Index in memory pool; encodes GPU vs CPU
    SizeType32 mRefCount;                         // Number of references to the block
    BlockKey mBlockKey;                           // Key in parent's mNextBlocks map
    BlockPtr mPrevBlock;                          // Previous block in reuse tree, or nullptr
    BlockPtr mPrevBlockInSeq;                     // Previous block in sequence
    NextBlockMap mNextBlocks;                     // Next block(s) in sequence(s)
    std::optional<FreeBlocksQueue::iterator> mFreeBlockIterator;  // Iterator in free queue
    bool mIsFull;                                 // Whether block is full
    executor::RetentionPriority mPriority;        // Priority of the block
    std::optional<std::chrono::milliseconds> mDurationMs;         // Duration priority applies
    std::optional<std::chrono::steady_clock::time_point::duration> mExpirationTime;  // Expiration
};`}
                </code></pre>
                <br></br>
                <p>
                    <code>BlockKey</code> is the label on each edge of the radix tree — it represents the token content and identity context of one block:
                </p>
                 <pre><code className="language-cpp">{`struct BlockKey {
    bool usesExtraIds = false;
    std::optional<LoraTaskIdType> loraTaskId;     // LoRA adapter identity; null = base model
    VecUniqueTokens uniqueTokens;                 // the tokensPerBlock token IDs
    std::vector<MmKey> extraKeys;                 // multimodal content hashes (images, etc.)
    std::optional<CacheSaltIDType> cacheSaltID;   // tenant isolation salt
};`}</code></pre>
                <br></br>
            </div>
            <h3>The Unified Block Tree — Structure and Storage</h3>
            <div>
                <p>
                    The unified block tree is a templated trie based data structure that is used for cache block indexing and reuse. Each level in the tree = one block of <code>tokensPerBlock</code> tokens from the prompt. A path of depth <code>N</code> from root to a node represents the first <code>N * tokensPerBlock</code> tokens of some request's context.
                </p>
                <p>
                    When two requests share the first K blocks but diverge at block K+1, the tree forks at depth K. The parent block at depth K has two entries in its <code>mNextBlocks</code> map, one per diverging child. Both children store their KV data independently in different GPU pool slots, but the K shared parent blocks are reference-counted and hold a single copy of their GPU data.
                </p>
                
                <div className="llm-callout">
                    <h4>Block States</h4>
                    <p>A block is either:</p>
                    <ol>
                        <li><strong>In the tree</strong>: <code>mPrevBlock != nullptr</code>. Its KV data is reusable by future requests.</li>
                        <li><strong>In the free queue</strong>: <code>mPrevBlock == nullptr</code>. Its GPU slot is available for a new request.</li>
                    </ol>
                    
                    <p style={{ marginTop: '1rem' }}>The transition between these states is:</p>
                    <ul>
                        <li><strong>Into tree</strong> (<code>storeBlocks</code>): <code>block-&gt;setPrevBlock(parent); parent-&gt;addNextBlock(blockKey, block);</code></li>
                        <li><strong>Out of tree</strong> (<code>freeLeafBlock</code>): <code>parent-&gt;removeNextBlock(mBlockKey); mPrevBlock = nullptr;</code></li>
                    </ul>
                    
                    <p style={{ marginTop: '1rem' }}>
                        Only <strong>leaf</strong> blocks (no children) can be placed into the free queue. This is because evicting a non-leaf would orphan its subtree.
                    </p>
                </div>
            </div>
            <div>
                <h4>Lookup: <code>loadOrAllocateBlocks</code></h4>
                <p>
                    Called during <code>addSequence()</code> for every new request. It chops the request's prompt tokens into <code>blockKeys</code> (one per <code>tokensPerBlock</code> chunk), then walks the radix tree block-by-block:
                </p>
                <pre><code className="language-cpp">{`auto searchRoot = mCachedBlocksRoot;
for (int bi = 0; bi < numSharedContextBlocks; ++bi) {
    auto [partialMatch, numMatched, matchingBlock] =
        searchRoot != nullptr
            ? searchRoot->findMatchingBlock(*blockItr, mEnablePartialReuse, mCopyOnPartialReuse)
            : std::make_tuple(false, 0, nullptr);
    ...
}`}</code></pre>

                <div style={{ marginTop: '1.5rem' }}>
                    <h5 style={{ marginBottom: '0.75rem' }}>On full hit:</h5>
                    <ol>
                        <li><code>mEvictionPolicy-&gt;claimBlock(matchingBlock, priority, duration)</code> — removes from eviction queue, increments refcount.</li>
                        <li><code>onboardBlock(sequence, matchingBlock, mode, directory)</code> — if in secondary (CPU) pool, schedules async GPU copy.</li>
                        <li><code>addBlockToAllBeams(matchingBlock, sequence)</code> — adds the <strong>same</strong> block pointer to all beam slots (shared).</li>
                        <li><code>searchRoot = matchingBlock</code> — advance cursor for next block lookup.</li>
                        <li><code>++mReusedBlocks</code>.</li>
                    </ol>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <h5 style={{ marginBottom: '0.75rem' }}>On partial hit:</h5>
                    <ul>
                        <li>If the matching block has active refs or is not a leaf (someone else is using it):
                            <ul>
                                <li><code>getFreeBlock(...)</code> allocates a new block.</li>
                                <li><code>mTransferManager-&gt;onboard(matchingBlock, newBlock, ..., numMatched)</code> copies the <code>numMatched</code> valid token slots into the new block.</li>
                            </ul>
                        </li>
                        <li>If the block is an unreferenced leaf (no one is using it):
                            <ul>
                                <li><code>freeLeafBlock(matchingBlock)</code> detaches it from its parent.</li>
                                <li><code>mEvictionPolicy-&gt;claimBlock(matchingBlock, ...)</code> repurposes it directly.</li>
                            </ul>
                        </li>
                        <li>After either path: <code>searchRoot = nullptr</code> — no further tree matching for subsequent blocks.</li>
                    </ul>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <h5 style={{ marginBottom: '0.75rem' }}>On miss:</h5>
                    <ol>
                        <li><code>getFreeBlock(...)</code> pops from eviction queue (may trigger eviction of a cached leaf).</li>
                        <li><code>freeBlock-&gt;setBlockKey(*blockItr, isFull)</code> — stamps token identity.</li>
                        <li><code>freeBlock-&gt;setHash()</code> — computes chained hash.</li>
                        <li><code>searchRoot = nullptr</code>.</li>
                        <li><code>++mMissedBlocks</code>.</li>
                    </ol>
                </div>

                <p style={{ marginTop: '1.5rem' }}>
                    At the end: <code>sequence.setCurrentPrepopulatedPromptLen(numMatchedTokens)</code> records how many tokens were actually served from cache — this flows back to the attention kernel to skip recomputation.
                </p>
            </div>
            <div style={{ marginTop: '2rem' }}>
                <h4>Insertion: <code>storeBlocks</code></h4>
                <p>
                    Called from <code>storeBlocksForReuse()</code> (sequence completion) and <code>storeNewBlock()</code> (incremental during generation). It walks the same radix tree, this time inserting rather than just looking up:
                </p>
                <pre><code className="language-cpp">{`auto searchRoot = mCachedBlocksRoot;
bool needMatch = true;
for (size_t blockCnt = 0; blockCnt < numBlocks; ++blockCnt) {
    auto [partialMatch, numMatched, matchedBlock] = needMatch
        ? searchRoot->findMatchingBlock(blockKey, false, false)
        : std::make_tuple(false, 0, nullptr);

    if (matchedBlock != nullptr) {
        // Already in tree — just advance cursor
        searchRoot = matchedBlock;
    } else {
        // Not in tree — wire this block in
        needMatch = false;
        block->setBlockKey(blockKey, isFull);
        block->setPrevBlock(searchRoot);
        block->setPrevBlockInSeq(searchRoot);
        searchRoot->addNextBlock(blockKey, block);  // thread-safe (mutex inside)
        block->setHash(BlockKeyHasher()(blockKey, searchRoot->getHash()));
        searchRoot = block;
        ++numBlocksStoredForReuse;
    }
}`}</code></pre>
                
                <p style={{ marginTop: '1rem' }}>
                    Once in the tree, a block's GPU memory is shared across all future requests that match its prefix. The block's <code>mRefCount</code> stays at 0 while no request is actively using it — it's reusable but evictable.
                </p>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
                <h4>Partial Reuse</h4>
                <p>
                    Partial reuse allows a cache hit when only the first <code>M &lt; tokensPerBlock</code> tokens of a block match. It is controlled by two flags on <code>WindowBlockManager</code>:
                </p>
                <ul>
                    <li><code>mEnablePartialReuse</code> — whether to attempt partial matching at all.</li>
                    <li><code>mCopyOnPartialReuse</code> — whether to copy the partial match into a new block (allowing the original to remain shared) or steal the block directly (only for unreferenced leaves).</li>
                </ul>
                <p>
                    The core matching logic is in <code>KVCacheBlock::findMatchingBlock()</code>:
                </p>
                <pre><code className="language-cpp">{`// Exact match
auto itr = mNextBlocks.find(blockKey);
if (itr != mNextBlocks.end()) {
    auto block = itr->second;
    return {!block->isFull(), blockKey.uniqueTokens.size(), block};
}

// Partial match: scan all children for best leading-token overlap
if (enablePartialReuse) {
    SizeType32 bestNumMatched{0};
    BlockPtr bestBlock{nullptr};
    for (auto const& [key, block] : mNextBlocks) {
        if (copyOnPartialReuse || (!block->hasRefs() && block->isLeaf())) {
            SizeType32 numMatched = key.numMatchingTokens(blockKey);
            if (numMatched > bestNumMatched) {
                bestNumMatched = numMatched;
                bestBlock = block;
            }
        }
    }
    if (bestNumMatched > 0) return {true, bestNumMatched, bestBlock};
}
return {false, 0, nullptr};`}</code></pre>
            <br></br>
            </div>
            <h3>Cache Salting</h3>
            <p>
                KV cache salting provides a security mechanism to control which requests can reuse cached KV states. When a <code>cache_salt</code> parameter is provided with a request, the KV cache system will only allow reuse of cached blocks given the same cache salt value. This prevents potential security issues such as prompt theft attacks, where malicious users might try to infer information from cached states of other users' requests.             
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