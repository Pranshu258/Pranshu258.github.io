import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
To simplify the implementation of the attention mechanism, one can use **padded tensors**, in which all sequences in a batch are padded to the same length. TensorRT-LLM uses **packed tensors** instead — there is no padding, and each sequence immediately follows the previous one in memory. The caller provides the cumulative sequence lengths so the kernel knows where each sequence starts.

## Why Padding Hurts

Consider a batch of sequences with lengths \`[512, 12, 7, 3]\`. With padding, every sequence is extended to 512 tokens, so 534 out of 2068 tokens (≈ 74%) are padding. All that work is wasted compute and memory bandwidth.

## Packed Layout

In the packed layout only the 534 real tokens are stored. The kernel receives an integer array of cumulative sequence lengths:

\`\`\`
seq_lens     = [512, 12, 7, 3]
cum_seq_lens = [0, 512, 524, 531, 534]
\`\`\`

Each thread block uses \`cum_seq_lens\` to find the start and end of its assigned sequence, allowing the same parallelism without the padding waste.

## Benefits

- **Reduced memory footprint**: Only real tokens occupy GPU memory.
- **Higher arithmetic intensity**: No wasted FLOPS on padding tokens.
- **Enables larger batches**: The freed-up memory can be used to fit more sequences.
`;

export default function PackedTensors() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
