import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
*This section is coming soon.*

Paged KV Cache is inspired by virtual memory paging in operating systems. Instead of allocating a large contiguous block of GPU memory for each sequence's key-value cache upfront, the cache is divided into fixed-size **pages** (blocks) that are allocated on demand.

## The Fragmentation Problem

Traditional KV cache allocation reserves the maximum possible sequence length for every request at admission time. Because the actual output length is unknown in advance, this leads to severe internal fragmentation — reserved memory that is never used. In practice, GPU memory utilization can fall below 20%.

## Paged Allocation

Each page holds the KV vectors for a fixed number of tokens (e.g., 16). A page table maps logical token positions to physical page locations in GPU memory. Pages are allocated one at a time as the sequence grows and freed immediately when the sequence finishes.

\`\`\`
Logical sequence:   [tok_0 ... tok_15] [tok_16 ... tok_31] ...
Physical pages:        Page #42            Page #7          ...
\`\`\`

## Benefits

- **Near-zero fragmentation**: Memory is allocated in small increments, so waste is bounded by at most one page per sequence.
- **Prefix caching**: Pages containing shared prompt prefixes can be reused across requests without copying.
- **Efficient sharing**: Multiple sequences (e.g., parallel sampling) can share read-only pages, further reducing memory pressure.

vLLM pioneered this approach and it is now standard in most high-throughput serving systems.
`;

export default function PagedKVCache() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
