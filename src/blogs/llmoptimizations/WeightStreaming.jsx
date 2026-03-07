import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdown = `
Weight streaming can offload some of the model weights to the CPU memory and then stream them to the GPU memory during runtime. This can reduce the weight size in GPU memory, allowing us to run larger models or larger batch sizes in the same GPU memory budget.

### How It Works

During inference, the model layers are executed sequentially. With weight streaming, only the weights for the layer currently being executed need to reside in GPU memory. As soon as a layer finishes, its weights can be evicted back to CPU memory (or simply not copied in the first place), and the weights for the next layer are streamed in.

The key insight is that modern systems have PCIe bandwidth that is often sufficient to keep the GPU fed, especially when the compute-to-memory ratio of each layer is high enough to hide the transfer latency.

### Trade-offs

- **Throughput vs. latency**: Streaming adds per-layer transfer overhead, so it typically reduces throughput. It is most beneficial when GPU memory is the bottleneck (very large models, large batch sizes).
- **NVLink vs. PCIe**: Systems with NVLink between GPUs can stream across GPUs much faster than PCIe-attached CPU memory.
- **Quantization synergy**: Combining weight streaming with low-bit quantization reduces the volume of data that must be transferred, amplifying the benefit.
`;

export default function WeightStreaming() {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>;
}
