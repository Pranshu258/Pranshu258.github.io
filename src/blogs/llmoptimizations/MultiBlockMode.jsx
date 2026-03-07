import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
The masked multi-head attention kernel in TensorRT-LLM has a special mode called **multi-block mode**. Typically, each attention head executes independently on a single CUDA thread block. In multi-block mode, the work for one head can be distributed across multiple thread blocks depending on GPU occupancy.

## The Problem It Solves

During the decode phase, the batch size is often small — frequently just 1. With only a few heads active, a standard single-block-per-head kernel leaves most of the GPU idle. The GPU has many streaming multiprocessors (SMs) but there are not enough thread blocks to fill them.

## How Multi-Block Mode Works

Multi-block mode partitions the sequence-length dimension across multiple thread blocks for each head. Each block computes a partial softmax over its slice of the KV cache, then a final reduction kernel combines the partial results into the correct output.

This is analogous to how split-k decomposition works for matrix multiplications: trade a small reduction overhead for dramatically better SM utilization.

## When to Enable It

Multi-block mode is beneficial when:

\`\`\`
batch_size * num_heads < num_streaming_multiprocessors
\`\`\`

For example, on an A100 (108 SMs), running a model with 32 heads at batch size 1 gives only 32 thread blocks — well below the 108 needed for full utilization. Enabling multi-block mode allows all 108 SMs to participate.

It is worth benchmarking both modes, as the reduction overhead can outweigh the occupancy gains at larger batch sizes.
`;

export default function MultiBlockMode() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
