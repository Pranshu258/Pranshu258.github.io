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
                Transformers generate text one token at a time. At each step, the model computes an attention score between the new token and every token that came before it &mdash; and that requires the <strong>key</strong> and <strong>value</strong> projections of all prior tokens. Without caching, those projections are recomputed from scratch on every step, making generation quadratic in sequence length. The KV cache eliminates this redundancy: projections are computed once and stored, so each new step only needs to produce one additional row and append it to the cache.
            </p>
            <p>
                Concretely, the scaled dot-product attention at decode step <Eq tex="t" /> is:
            </p>
            <Eq display={true} tex={String.raw`\text{Attention}(\mathbf{q}_t,\, K_{1:t},\, V_{1:t}) = \text{softmax}\!\left(\frac{\mathbf{q}_t \, K_{1:t}^{\top}}{\sqrt{d_k}}\right) V_{1:t}`} />
            <p>
                Here <Eq tex="\mathbf{q}_t" /> is the query for the current token, while <Eq tex="K_{1:t}" /> and <Eq tex="V_{1:t}" /> are matrices whose rows are the keys and values of all tokens up to and including step <Eq tex="t" />. The factor <Eq tex="\sqrt{d_k}" /> keeps the dot products from growing too large as dimension increases. With a KV cache, <Eq tex="K_{1:t-1}" /> and <Eq tex="V_{1:t-1}" /> are already in memory; only the new rows <Eq tex="\mathbf{k}_t" /> and <Eq tex="\mathbf{v}_t" /> need to be computed and appended.
            </p>
            <p>
                The cost is memory. Every cached token consumes <code>2 &times; num_layers &times; num_kv_heads &times; head_dim &times; sizeof(dtype)</code> bytes, and that footprint scales with both batch size and sequence length. For a large model serving long contexts, the cache alone can occupy several gigabytes of VRAM. Managing it carefully &mdash; what to keep, at what precision, and where to store it &mdash; is one of the central levers for maximising inference throughput.
            </p>
        </div>
    );
}