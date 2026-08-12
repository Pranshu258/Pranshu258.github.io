import React from 'react';
import Sharer from '../sharer';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../styles/blog.css';
import kimiLogo from '../images/kimi-icon.webp';
import { KDARecurrenceViz, KDAChunkwiseViz } from './KDAViz';

function Eq({ tex, display = false }) {
    return (
        <span
            dangerouslySetInnerHTML={{
                __html: katex.renderToString(tex, { displayMode: display, throwOnError: false })
            }}
        />
    );
}

export default class KimiDeltaAttention extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Kimi Delta Attention | blog by Pranshu Gupta";
    }

    render() {
        return (
            <div className="blog-content">
                <div className="row bhead">
                    <img src={kimiLogo} alt="Kimi" className="kimi-logo gt1" />
                </div>
                <h1 className="title">Kimi Delta Attention</h1>
                <p>Pranshu Gupta, {this.props.date}</p>
                <Sharer className="sharer" link={window.location.href} title={"Kimi Delta Attention"}></Sharer>
                <p className="introduction">
                    Kimi K3 is a 2.8 trillion parameter mixture-of-experts (MoE) model with 104 billion active parameters, native vision capabilities, and a 1 million token context window. At its core lie two ideas that improve how information flows across sequence length and model depth: Kimi Delta Attention (KDA) and attention residuals.
                    KDA is a hybrid architecture that &mdash; for the first time under fair comparisons &mdash; outperforms full attention across short-context, long-context, and RL-scaling regimes. This article explores how it works.
                </p>
                <hr style={{ backgroundColor: "white" }} />
                <h2 className="headings">Linear Delta Attention</h2>
                <p>
                    Softmax attention keeps a growing key&ndash;value cache and pays a cost that scales with the full
                    context at every decoding step. Linear attention instead compresses the past into a fixed-size
                    state matrix <Eq tex="S_t" /> that is updated recurrently, decoupling the per-step cost from the
                    sequence length:
                </p>
                <Eq display={true} tex={String.raw`S_t = S_{t-1} + \mathbf{k}_t\mathbf{v}_t^{\top}, \qquad \tilde{\mathbf{o}}_t = S_t^{\top}\mathbf{q}_t `} />
                <p>
                    This constant-memory, constant-compute recurrence is what gives Kimi Linear its reported
                    up-to-75% KV-cache reduction and up-to-6&times; decoding throughput at a 1M-token context. The
                    challenge &mdash; and what the rest of this article unpacks &mdash; is making such a compressed
                    state <em>expressive</em> enough to rival full attention.
                </p>
                <p>
                    Think of ordinary multi-head attention as searching a growing list, where every token creates a key and a value, all past keys and values are stored, and the current query scores every stored keys and combines their values. 
                    KDA replaces that growing list with a fixed size memory matrix <Eq tex="S_t" />. For each new token, it does the following: 
                </p>
                <ol>
                    <li>
                        Forget a little - each part of memory has it's own retention control. <Eq tex="\alpha \approx 1" /> keep, <Eq tex="\alpha \approx 0" /> forget.
                    </li>
                    <li>
                        Store the new key value asociation - In standard self attention, the token says when a future query resembles this key, return the associated value. But KDA does not blindly follow this. It checks what memeory already returns for that key and stores only the correction. This reduces repeated or conflicting information. <Eq tex="\beta_t" /> controls how strongly the correction is written. <Eq tex="\beta_t \approx 1"/> means strong update, and <Eq tex="\beta_t \approx 0"/> a weak update.
                    </li>
                    <li>
                        Read from memory - the query interacts with the memory matrix to retreive an output. We can think of KDA's memory as a reusable notebook. Where key is the label of the note, value is the information under that label, query is what you are looking for, <Eq tex="\alpha"/> tells which sections of the notebook should fade, <Eq tex="\beta"/> tells how strongly to update the note, <Eq tex="\Delta"/> erase the incorrect part and write only the necessary correction. 
                    </li>
                </ol>

                <hr style={{ backgroundColor: "white" }} />
                <h2 className="headings">Kimi Delta Attention</h2>
                <p>
                    KDA extends the delta-rule recurrence with a <strong>channel-wise forget gate</strong>. For a single
                    head, with query and key <Eq tex={String.raw`\mathbf{q}_t, \mathbf{k}_t \in \mathbb{R}^{d_k}`} />,
                    value <Eq tex={String.raw`\mathbf{v}_t \in \mathbb{R}^{d_v}`} />, and recurrent state
                    <Eq tex={String.raw`\ S_t \in \mathbb{R}^{d_k \times d_v}`} />, it applies decay <em>before</em> the
                    delta-rule update:
                </p>
                <Eq display={true} tex={String.raw`S_t = \left(\mathbf{I} - \beta_t\,\mathbf{k}_t\mathbf{k}_t^{\top}\right)\mathrm{Diag}(\boldsymbol{\alpha}_t)\,S_{t-1} + \beta_t\,\mathbf{k}_t\mathbf{v}_t^{\top}, \qquad \tilde{\mathbf{o}}_t = S_t^{\top}\mathbf{q}_t`} />
                <p>
                    Here <Eq tex={String.raw`\boldsymbol{\alpha}_t \in (0,1)^{d_k}`} /> is the <em>per-channel</em> retention
                    factor and <Eq tex={String.raw`\beta_t \in (0,1)`} /> controls the delta-rule write strength. We can understand each term from the ground up: 
                </p>
                <ol>
                    <li>
                        Fade the old memory: <Eq tex="\mathrm{Diag}(\boldsymbol{\alpha}_t)\,S_{t-1}" />
                    </li>
                    <li>
                        Find what memory currently associates with the key: <Eq tex="\mathbf{k}_t^{\top} \mathrm{Diag}(\boldsymbol{\alpha}_t)\,S_{t-1}" />
                    </li>
                    <li>
                        Compare with the desired value: <Eq tex="\mathbf{v}_t^{\top} - \mathbf{k}_t^{\top} \mathrm{Diag}(\boldsymbol{\alpha}_t)\,S_{t-1}" />
                    </li>
                    <li>
                        Write the correction: <Eq tex="\mathrm{Diag}(\boldsymbol{\alpha}_t)\,S_{t-1} + \beta_t\mathbf{k}_t\left(\mathbf{v}_t^{\top} - \mathbf{k}_t^{\top} \mathrm{Diag}(\boldsymbol{\alpha}_t)\,S_{t-1}\right)" />. This can be rearranged to get the equation above.
                    </li>
                </ol>
                <p>
                    Why does multiplying by the key recover the right memory value? The key acts as a weighted combination of the rows of memory, and that same weighting governs how the value is written. So after the update, reading with the same key returns exactly the desired value &mdash; provided keys are distinct. When two keys are similar, their memory locations overlap and their updates interfere. KDA sidesteps this by learning useful key representations: similar keys can deliberately share information, while unrelated keys are pushed toward different directions to minimise harmful overlap.
                </p>
                <KDARecurrenceViz />
                <h3 className="headings">Producing Queries, Keys and Values</h3>
                <p>
                    Short convolution mixes in small amount of information from nearby tokens, Swish applies a non linear activation, and <Eq tex="\mathbf{L}_2" /> norm rescales the final vector so its total length is 1, while its direction remains the same. 

                    <Eq display={true} tex="\mathbf{q}_t^h = \mathbf{L}_2\left( \mathbf{Swish} \left( \mathbf{ShortConv} \left( \mathbf{W}_q^h \mathbf{x}_t \right) \right) \right)" />

                    <Eq display={true} tex="\mathbf{k}_t^h = \mathbf{L}_2\left( \mathbf{Swish} \left( \mathbf{ShortConv} \left( \mathbf{W}_k^h \mathbf{x}_t \right) \right) \right)" />

                    For values, we do not perform the <Eq tex="\mathbf{L}_2" /> norm because we want the values to have different magnitudes. 

                    <Eq display={true} tex="\mathbf{v}_t^h = \mathbf{Swish} \left( \mathbf{ShortConv} \left( \mathbf{W}_v^h \mathbf{x}_t \right) \right)" />
                </p>
                <hr style={{ backgroundColor: "white" }} />
                {/* <h2 className="headings">Making it hardware-efficient: the chunkwise form</h2>
                <p>
                    The token-by-token recurrence is inherently sequential. To use the GPU well, KDA is made
                    <em> recurrent across chunks and parallel within each chunk</em>. For a chunk of size
                    <Eq tex={String.raw`\ C`} />, define the channel-wise cumulative decay
                    <Eq tex={String.raw`\ \boldsymbol{\gamma}^{\,i\to j} := \textstyle\prod_{r=i}^{j}\boldsymbol{\alpha}_r`} />.
                    Given the state <Eq tex={String.raw`S_{[t]}`} /> entering chunk <Eq tex="t" />, every output in the
                    chunk is computed in one shot:
                </p>
                <Eq display={true} tex={String.raw`\mathbf{A}_{[t]} = \mathrm{Tril}\!\left[\left(\mathbf{Q}_{[t]} \odot \boldsymbol{\Gamma}^{1\to C}_{[t]}\right)\!\left(\mathbf{K}_{[t]} / \boldsymbol{\Gamma}^{1\to C}_{[t]}\right)^{\top}\right]`} />
                <Eq display={true} tex={"\\mathbf{O}_{[t]} = \\underbrace{\\left(\\boldsymbol{\\Gamma}^{1\\to C}_{[t]} \\odot \\mathbf{Q}_{[t]}\\right)S_{[t]}}_{\\text{inter-chunk}} + \\underbrace{\\mathbf{A}_{[t]}\\,\\tilde{\\mathbf{V}}_{[t]}}_{\\text{intra-chunk}}"} />
                <p>
                    <Eq tex={String.raw`\mathrm{Tril}`} /> zeroes the strictly upper-triangular entries, enforcing causal
                    interactions within the chunk while keeping the diagonal (each output reads the state <em>after</em>
                    its own update). The first term propagates information from earlier chunks; the second captures
                    interactions inside the current chunk via a specialised Diagonal-Plus-Low-Rank transition that is
                    cheaper than the general DPLR form yet stays faithful to the classical delta rule.
                </p>

                <KDAChunkwiseViz /> */}

                {/* <hr style={{ backgroundColor: "white" }} /> */}
                <h3 className="headings">References</h3>
                <ol>
                    <li>
                        <a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://arxiv.org/abs/2510.26692">
                            Kimi Team. <em>Kimi Linear: An Expressive, Efficient Attention Architecture</em>. arXiv:2510.26692 (2025).
                        </a>
                    </li>
                </ol>
                <br></br>
            </div>
        );
    }
}
