import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
*This section is coming soon.*

Chunked context (also called chunked prefill) splits a long prefill into smaller chunks so that prefill work and decode work can be interleaved within the same batch iteration.

## Prefill vs. Decode

LLM inference has two distinct phases:

- **Prefill**: Process all prompt tokens in parallel. This is compute-bound and very fast.
- **Decode**: Generate one new token per step in an autoregressive loop. This is memory-bandwidth-bound and relatively slow.

In a serving system, long prefill requests can **stall** ongoing decode requests for many milliseconds, causing spikes in time-to-first-token latency for other users.

## Chunking the Prefill

With chunked context, a long prompt of, say, 4096 tokens is split into chunks of 256 tokens each. In each scheduler iteration, one chunk of the prefill is processed alongside the current decode batch. This limits the compute budget any single prefill can consume per iteration, bounding the stall time imposed on decode requests.

## Trade-offs

- **TTFT vs. TPOT**: Chunking spreads the prefill cost across multiple iterations, increasing time-to-first-token for the prefill request but improving tail latency for concurrent decode requests.
- **Chunk size tuning**: Larger chunks amortize per-iteration overhead; smaller chunks reduce memory pressure but increase scheduling complexity.
`;

export default function ChunkedContext() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
