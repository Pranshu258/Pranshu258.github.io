import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
*This section is coming soon.*

In-flight batching (also called continuous batching) is a scheduling strategy where new requests are dynamically inserted into an ongoing batch as soon as a slot becomes available, rather than waiting for every sequence in the batch to finish before starting a new batch.

## The Problem with Static Batching

In static batching, a batch of \`N\` requests is processed together until all \`N\` responses are complete. Because different requests generate different numbers of output tokens, the longest sequence determines when the entire batch finishes. Short sequences that complete early leave their GPU slots idle — a phenomenon called **bubbles**.

## Continuous Batching

With continuous batching, the scheduler monitors which sequences in the current batch have emitted an EOS (end-of-sequence) token. Completed slots are immediately freed and filled with the next waiting request from the queue. The GPU is always processing a full batch of active sequences.

## Impact

- **Throughput**: Near-linear improvement proportional to the variance in output sequence lengths.
- **Latency**: First-token latency for queued requests drops because they no longer wait for unrelated long sequences to complete.
- **Adoption**: Implemented in vLLM, TensorRT-LLM, and most production serving frameworks.
`;

export default function InFlightBatching() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
