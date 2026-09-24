import React from 'react';
import { PiStackDuotone } from 'react-icons/pi';
import { LuArrowUpRight } from 'react-icons/lu';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';

const TITLE = 'MuxServe: Multiplexing LLM Inference';

export default class MuxServe extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = `${TITLE} | blog by Pranshu Gupta`;
    }

    render() {
        return (
            <div>
                <div className="row bhead">
                    <PiStackDuotone className="bigger gt1" />
                </div>
                <h1 className="title">{TITLE}</h1>
                <p>Pranshu Gupta, {this.props.date}</p>
                <Sharer className="sharer" link={window.location.href} title={TITLE} />

                <hr />
                <h2 className="headings">Source material</h2>
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
}
