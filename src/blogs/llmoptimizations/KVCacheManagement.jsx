import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-bash';
import '../../styles/prism.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function Eq({ tex, display = false }) {
    return (
        <span
            dangerouslySetInnerHTML={{
                __html: katex.renderToString(tex, { displayMode: display, throwOnError: false })
            }}
        />
    );
}

function MermaidDiagram({ svg }) {
    return (
        <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ overflowX: 'auto', margin: '1.5rem 0', display: 'flex', justifyContent: 'center', borderRadius: '0.5rem', padding: '1rem' }}
        />
    );
}

export default function WeightStreaming() {
    useEffect(() => {
        Prism.highlightAll();
    }, []);
    return (
        <div>
            <p>
                During autoregressive decoding, a transformer computes <strong>key</strong> and <strong>value</strong> tensors for every token in the sequence at every layer. Without caching, generating token <em>n</em> requires reprocessing all <em>n&nbsp;&minus;&nbsp;1</em> preceding tokens from scratch &mdash; an O(n<sup>2</sup>) cost that grows prohibitively for long sequences. The KV cache solves this by storing the key and value projections for each past token immediately after they are computed and reusing them on every subsequent step. Generation then becomes O(n) in time per step: only the single new token&rsquo;s projections are computed, appended to the cache, and the full set is passed to the attention kernel.
            </p>
            <p>
                The standard scaled dot-product attention at decode step <Eq tex="t" /> is:
            </p>
            <Eq display={true} tex={String.raw`\text{Attention}(\mathbf{q}_t,\, K_{1:t},\, V_{1:t}) = \text{softmax}\!\left(\frac{\mathbf{q}_t \, K_{1:t}^{\top}}{\sqrt{d_k}}\right) V_{1:t}`} />
            <p>
                where <Eq tex="\mathbf{q}_t \in \mathbb{R}^{d_k}" /> is the query for the current token, <Eq tex="K_{1:t} \in \mathbb{R}^{t \times d_k}" /> and <Eq tex="V_{1:t} \in \mathbb{R}^{t \times d_v}" /> are the accumulated key and value matrices across all <Eq tex="t" /> tokens, and <Eq tex="d_k" /> is the key dimension used for scaling. Without a KV cache, <Eq tex="K_{1:t}" /> and <Eq tex="V_{1:t}" /> must be recomputed from scratch at every step; with caching, only the new row <Eq tex="\mathbf{k}_t" /> and <Eq tex="\mathbf{v}_t" /> are appended to the stored matrices.
            </p>
            <p>
                The trade-off is memory. Each cached token occupies <code>2 &times; num_layers &times; num_kv_heads &times; head_dim &times; sizeof(dtype)</code> bytes. For a large model at long context lengths this amounts to several gigabytes, and the cache grows linearly with both batch size and sequence length. Efficient KV cache management &mdash; controlling what is stored, at what precision, and where &mdash; is therefore central to maximising throughput without exhausting VRAM.
            </p>
        </div>
    );
}