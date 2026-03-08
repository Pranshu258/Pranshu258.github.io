export const sections = [
    {
        slug: "model-offloading",
        name: "Model Offloading",
        description: "Offload model weights to CPU memory and stream them to the GPU during runtime to run larger models within the same memory budget.",
        date: "March 8, 2026",
    },
    // {
    //     slug: "packed-tensors",
    //     name: "Packed Tensors",
    //     description: "Eliminate padding overhead by storing only valid tokens, improving memory utilization and throughput.",
    //     date: "",
    // },
    // {
    //     slug: "multi-block-mode",
    //     name: "Multi Block Mode",
    //     description: "Distribute attention head computation across multiple CUDA thread blocks to improve GPU occupancy at small batch sizes.",
    //     date: "",
    // },
    // {
    //     slug: "in-flight-batching",
    //     name: "In-Flight Batching",
    //     description: "Dynamically insert new requests into an ongoing batch as soon as a slot frees up, maximizing GPU utilization.",
    //     date: "",
    // },
    // {
    //     slug: "chunked-context",
    //     name: "Chunked Context",
    //     description: "Split long prefill sequences into smaller chunks to interleave prefill and decode work within the same batch.",
    //     date: "",
    // },
    // {
    //     slug: "paged-kv-cache",
    //     name: "Paged KV Cache",
    //     description: "Manage the key-value cache as fixed-size pages to eliminate memory fragmentation and enable efficient sharing.",
    //     date: "",
    // },
    // {
    //     slug: "quantized-kv-cache",
    //     name: "Quantized KV Cache",
    //     description: "Store KV cache values at reduced precision to cut memory bandwidth and fit larger contexts in the same budget.",
    //     date: "",
    // },
    // {
    //     slug: "sliding-window-attention",
    //     name: "Sliding Window Attention",
    //     description: "Restrict each token's attention to a fixed-size local window to reduce the quadratic cost of full attention.",
    //     date: "",
    // },
    // {
    //     slug: "flash-attention",
    //     name: "Flash Attention",
    //     description: "Fuse attention operations into a single GPU kernel using tiling and recomputation to minimize memory reads and writes.",
    //     date: "",
    // },
];
