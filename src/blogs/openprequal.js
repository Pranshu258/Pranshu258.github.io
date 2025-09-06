import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';

export default class OpenPrequalBlog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentLatencyMetric: "average",
            currentDistribution: "prequal"
        };
    }

    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Coding YouTube's load balancer using GitHub Copilot | blog by Pranshu Gupta";
    }

    render() {
        const { currentLatencyMetric, currentDistribution } = this.state;

        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-hexagon-nodes bigger gt1"></i>
                </div>
                <h1 className="title">Coding YouTube's load balancer using GitHub Copilot</h1>
                <p>Pranshu Gupta, September 07, 2025</p>
                <Sharer className="sharer" link={window.location.href} title={"Coding YouTube's load balancer using GitHub Copilot"}></Sharer>
                
                <h2>Introduction</h2>
                <p>
                    YouTube is the world's largest video sharing platform, where anyone can upload, watch and share videos for free. Over 100 hours of video content is uploaded every minute, a mind bending amount of content, ranging from adorable cats to deep scientific explainations. Load balancing is a critical component of any highly scalable service like YouTube. Google uses an algorithm that it calls <b>Prequal</b>, an abbreviation for "Probing to reduce Queueing and Latency", for load balacing services that make up the YouTube platform.
                </p>
                <p>
                    Prequal is a load balancer for distributed multi-tenant systems, that aims to minimize real-time request latency in presence of heterogenous server capacities and non-uniform, time-varying antagonist load. In this article, we will explore an AI assited implementation of this algorithm using Python's FastAPI. FastAPI is a popular web framework for building APIs with Python and has been optimized to be on par with NodeJS and Go (using libraries like Starlette and Pydantic).
                </p>
                <p style={{backgroundColor: "pink", padding: '10px', borderRadius: '5px'}}>
                    This is an experimental project with many potential performance optimizations that remain unexplored.
                </p>
                <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none", marginRight: "10px" }} href="https://github.com/Pranshu258/OpenPrequal">
                    <button className="btn btn-danger">
                        <i className="fab fa-google"></i>
                        <b style={{ padding: "10px" }}>Google's Prequal Paper</b>
                        <i className="fas fa-external-link-alt"></i>
                    </button>
                </a>
                <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal">
                    <button className="btn btn-warning">
                        <i className="fab fa-github"></i>
                        <b style={{ padding: "10px" }}>OpenPrequal on GitHub</b>
                        <i className="fas fa-external-link-alt"></i>
                    </button>
                </a>
                <hr style={{ backgroundColor: "white" }} />
                <h2>Agent Assisted Coding</h2>
                <p>
                    For this project, I relied entirely on VS Code and GitHub Copilot, guiding the agent by specifying requirements and desired changes, while making very few manual code edits myself. Most of my prompts were handled by OpenAI's GPT-4.1, with occasional use of GPT-5 mini, o3-mini, and Anthropic Claude Sonnet for tasks where GPT-4.1 did not perform as well. This is expected, since GPT-4.1 is a non-reasoning model and may not match the performance of reasoning models like o3 and GPT-5 on more complex tasks.
                </p>
                <h3>Reasoning Models?</h3>
                <p>

                </p>
                <h2>References</h2>
                <ol>
                    <li><a href='https://fastapi.tiangolo.com/'>Python FastAPI</a> - modern, fast (high-performance), web framework for building APIs with Python</li>
                    <li><a href='https://github.com/features/copilot'>GitHub Copilot</a> - AI that builds with you</li>
                </ol>
                <hr style={{ backgroundColor: "white" }} />
            </div>
        );
    }
}