import React from 'react';
import { LuArrowUpRight } from 'react-icons/lu';

export default function MuxServe() {
    return (
        <div>
            <h3>Source material</h3>
            <p>
                <a
                    className="accordion-link"
                    href="https://proceedings.mlr.press/v235/duan24a.html"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    MuxServe paper <LuArrowUpRight style={{ marginLeft: '4px' }} strokeWidth={3} />
                </a>
            </p>
            <p>
                <a
                    className="accordion-link"
                    href="https://github.com/EfficientLLMSys/MuxServe"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    MuxServe on GitHub <LuArrowUpRight style={{ marginLeft: '4px' }} strokeWidth={3} />
                </a>
            </p>
        </div>
    );
}
