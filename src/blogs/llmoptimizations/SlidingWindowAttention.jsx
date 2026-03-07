import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
*This section is coming soon.*

Sliding Window Attention (SWA) restricts each token's attention to a fixed-size local window of \`W\` preceding tokens, rather than attending to the entire context. This reduces the quadratic \`O(n²)\` cost of full attention to \`O(n·W)\`.

## Full Attention vs. Sliding Window

In standard attention, token at position \`i\` attends to all tokens \`0…i\`. At sequence length 32K, computing a single attention layer requires ~1 billion multiply-adds. With a window of \`W = 4096\`, the same layer needs only ~4 billion multiply-adds regardless of context length — a constant cost per token.

## How Information Propagates

With a window of size \`W\` and \`L\` transformer layers, information from a token at position \`i\` can reach position \`i + W·L\` in the final representation. A model with 32 layers and window size 4096 has an effective receptive field of 131,072 tokens — sufficient for most practical tasks.

## Mistral and Mixtral

Mistral 7B popularized SWA by combining it with grouped query attention. The model achieves strong benchmark scores at 32K context while using a window of only 4096, demonstrating that full attention is often not necessary for good language modeling.

## KV Cache Implications

SWA limits the KV cache to \`W\` entries per head per layer, regardless of the total sequence length. This dramatically reduces KV cache memory and enables very long-context serving at fixed memory cost.
`;

export default function SlidingWindowAttention() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
