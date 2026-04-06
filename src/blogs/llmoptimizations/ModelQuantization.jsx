import React, { useEffect } from 'react';
import { SiNvidia, SiHuggingface } from 'react-icons/si';
import offloadFlowSvg from './offload-chart.svg?raw';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-bash';
import '../../styles/prism.css';

function MermaidDiagram({ svg }) {
    return (
        <div
            className="mermaid-diagram"
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ overflowX: 'auto', margin: '1.5rem 0', display: 'flex', justifyContent: 'center', borderRadius: '0.5rem', padding: '1rem' }}
        />
    );
}

export default function ModelQuantization() {
    useEffect(() => {
        Prism.highlightAll();
    }, []);
    return (
        <div>
            <p>
                Quantization reduces the numerical precision of model weights and/or activations to enable efficient deployment of large language models by trading off precision with memory usage.
            </p>
        </div>
    );
}