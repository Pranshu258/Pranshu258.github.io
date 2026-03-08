import React, { useEffect, Suspense } from 'react';
import { Routes, Route, useParams, Link, useLocation } from 'react-router-dom';
import { PiRobotDuotone } from 'react-icons/pi';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa6';
import Sharer from '../../sharer';
import { sections } from './sections';
import '../../styles/fonts.css';
import '../../styles/blog.css';
import '../../styles/llmoptimizations.css';

// Each section is its own lazy chunk — only loaded when navigated to
const sectionComponents = {
    'model-offloading':          React.lazy(() => import('./ModelOffloading')),
    // 'packed-tensors':            React.lazy(() => import('./PackedTensors')),
    // 'multi-block-mode':          React.lazy(() => import('./MultiBlockMode')),
    // 'in-flight-batching':        React.lazy(() => import('./InFlightBatching')),
    // 'chunked-context':           React.lazy(() => import('./ChunkedContext')),
    // 'paged-kv-cache':            React.lazy(() => import('./PagedKVCache')),
    // 'quantized-kv-cache':        React.lazy(() => import('./QuantizedKVCache')),
    // 'sliding-window-attention':  React.lazy(() => import('./SlidingWindowAttention')),
    // 'flash-attention':           React.lazy(() => import('./FlashAttention')),
};

function SectionView() {
    const { section } = useParams();
    const sectionMeta = sections.find(s => s.slug === section);
    const sectionIndex = sections.findIndex(s => s.slug === section);
    const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
    const nextSection = sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;
    const Component = sectionComponents[section];

    useEffect(() => {
        window.scrollTo(0, 0);
        if (sectionMeta) {
            document.title = `${sectionMeta.name} — Runtime optimizations for LLMs | Pranshu Gupta`;
        }
    }, [section, sectionMeta]);

    if (!Component || !sectionMeta) {
        return (
            <div className="llm-not-found">
                <p>Section not found.</p>
                <Link to="../" relative="path" className="llm-back-link"><FaArrowLeft /> Back to sections</Link>
            </div>
        );
    }

    return (
        <div className="llm-section-view">
            <Link to="../" relative="path" className="llm-back-link"><FaArrowLeft /> All sections</Link>
            <h2>{sectionMeta.name}</h2>
            <Suspense fallback={
                <div className="blog-loading">
                    <div className="blog-loading-spinner"></div>
                    <div className="blog-loading-text">Loading section...</div>
                </div>
            }>
            <Component />
            </Suspense>
        </div>
    );
}

function TableOfContents() {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = 'Runtime optimizations for LLMs | blog by Pranshu Gupta';
    }, []);

    return (
        <div className="llm-toc">
            <p className="llm-toc-label">Select a section to read</p>
            <div className="llm-accordion">
                {sections.map((s, i) => (
                    <Link key={s.slug} to={s.slug} className="llm-accordion-item">
                        <span className="llm-accordion-number">{String(i + 1).padStart(2, '0')}</span>
                        <div className="llm-accordion-body">
                            <div className="llm-accordion-title">{s.name}</div>
                            <div className="llm-accordion-desc">{s.description}</div>
                        </div>
                        <FaArrowRight className="llm-accordion-chevron" />
                    </Link>
                ))}
            </div>
            <p className="llm-toc-footer">More sections will be added over time.</p>
        </div>
    );
}

export default function LLMOpt({ date }) {
    const location = useLocation();
    const currentSection = sections.find(s => location.pathname.endsWith(s.slug));
    const displayDate = currentSection?.date || date;
    const shareLink = window.location.origin + location.pathname;
    const shareTitle = currentSection
        ? `${currentSection.name} — Runtime optimizations for LLMs`
        : 'Runtime optimizations for LLMs';

    return (
        <div>
            <div className="row bhead">
                <PiRobotDuotone className="bigger gt1" />
            </div>
            <h1 className="title">Runtime optimizations for Large Language Models</h1>
            <p>Pranshu Gupta, {displayDate}</p>
            <Sharer className="sharer" link={shareLink} title={shareTitle} />
            <p className="introduction">
                Large Language Models (LLMs) are a class of deep learning models that have gained significant attention
                in recent years due to their ability to generate human-like text. However, the computational resources
                required to train and deploy these models can be substantial. In this article, we explore some of the
                runtime optimizations applied by hyperscalers to improve LLM inference performance and reduce resource
                consumption.
            </p>
            <hr style={{ backgroundColor: "white" }} />
            <Routes>
                <Route index element={<TableOfContents />} />
                <Route path=":section" element={<SectionView />} />
            </Routes>
            <hr style={{ backgroundColor: "white" }} />
            <h3 className="headings">References</h3>
            <ol>
                <li>
                    <a style={{ textAlign: 'left', color: 'black', fontSize: 'inherit' }}
                       href="https://github.com/NVIDIA/TensorRT-LLM/blob/main/docs/source/legacy/advanced/weight-streaming.md">
                        TensorRT LLM - Running With Weight Streaming to Reduce GPU Memory Consumption
                    </a>
                </li>
                <li>
                    <a style={{ textAlign: 'left', color: 'black', fontSize: 'inherit' }}
                       href="https://github.com/huggingface/accelerate/blob/main/docs/source/concept_guides/big_model_inference.md">
                        HuggingFace Accelerate - Big Model Inference
                    </a>
                </li>
                <li>
                    <a style={{ textAlign: 'left', color: 'black', fontSize: 'inherit' }}
                       href="https://github.com/huggingface/accelerate/blob/main/src/accelerate/hooks.py">
                        HuggingFace Accelerate - Hooks
                    </a>
                </li>
            </ol>
        </div>
    );
}
