import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
*This section is coming soon.*

Quantized KV Cache stores the keys and values of the attention cache at reduced floating-point precision (e.g., FP8, INT8, or INT4) instead of the standard FP16 or BF16. Since the KV cache is the dominant memory consumer at long contexts and large batch sizes, this is one of the highest-leverage optimizations available.

## Memory Breakdown

For a 70B parameter model with 80 attention layers, 8 KV heads, and a head dimension of 128, the KV cache size per token is:

\`\`\`
2 (K and V) × 80 (layers) × 8 (heads) × 128 (head_dim) × 2 (bytes for FP16)
= 327,680 bytes ≈ 320 KB per token
\`\`\`

At 4096 tokens and batch size 32, that is over **40 GB** — exceeding the entire memory of some GPUs. Quantizing to INT8 halves this; INT4 quarters it.

## Quantization Schemes

- **Per-tensor**: A single scale factor covers the entire KV tensor. Fast but lowest accuracy.
- **Per-channel/per-head**: A scale per head. Better accuracy with modest overhead.
- **Per-token (dynamic)**: The scale is computed at runtime for each new token. Highest accuracy, small compute overhead.

## Accuracy Impact

KV quantization introduces approximation error in the attention scores. For INT8 the quality degradation is typically negligible. For INT4 it depends heavily on the model and task — some models require fine-tuning with quantization-aware objectives.
`;

export default function QuantizedKVCache() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
