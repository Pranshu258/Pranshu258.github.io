import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
*This section is coming soon.*

Flash Attention is an IO-aware exact attention algorithm that restructures the computation to minimize data movement between GPU HBM (high-bandwidth memory) and SRAM (on-chip cache). It is currently the dominant attention kernel in production LLM systems.

## The Standard Attention Bottleneck

Naive attention materializes the full \`N×N\` attention score matrix in HBM. For sequence length \`N = 8192\` in FP16, that matrix alone is 128 MB — and it must be read and written multiple times for the softmax and value multiply. The bottleneck is **memory bandwidth**, not arithmetic throughput.

## Tiling and Recomputation

Flash Attention avoids writing the full score matrix to HBM by:

1. **Tiling** the Q, K, V matrices into blocks that fit in SRAM.
2. Computing a partial softmax over each block using the *online softmax* algorithm, accumulating a running maximum and normalization factor.
3. **Recomputing** the attention scores during the backward pass from \`Q\`, \`K\`, \`V\` instead of storing them — trading FLOPs for memory.

This reduces HBM reads/writes from \`O(N²)\` to \`O(N)\`, resulting in **2–4× wall-clock speedup** for typical sequence lengths.

## Flash Attention 2 and 3

Flash Attention 2 improves the parallelism strategy (loop order, warp tiling) to better utilize modern GPU tensor cores, achieving close to theoretical peak throughput. Flash Attention 3 exploits Hopper-generation hardware features (TMA, WGMMA), pushing throughput further.

## Adoption

Flash Attention is now the default attention backend in Hugging Face Transformers, PyTorch, TensorRT-LLM, vLLM, and virtually every major inference framework.
`;

export default function FlashAttention() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
