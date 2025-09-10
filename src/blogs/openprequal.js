import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';

import reverseproxy from '../images/openprequal/reverseproxy.svg';
import openprequal from '../images/openprequal/openprequal.svg';

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
        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-hexagon-nodes bigger gt1"></i>
                </div>
                <h1 className="title">Coding YouTube's load balancer using GitHub Copilot</h1>
                <p>Pranshu Gupta, September 12, 2025</p>
                <Sharer className="sharer" link={window.location.href} title={"Coding YouTube's load balancer using GitHub Copilot"}></Sharer>
                
                <h2>Introduction</h2>
                <p>
                    YouTube is the world's largest video sharing platform, where anyone can upload, watch and share videos for free. Over 100 hours of video content is uploaded every minute, a mind bending amount of content, ranging from adorable cats to deep scientific explainations. Load balancing is a critical component of any highly scalable service like YouTube. Google uses an algorithm that it calls <b>Prequal</b>, an abbreviation for "Probing to reduce Queueing and Latency", for load balacing services that make up the YouTube platform.
                </p>
                <p>
                    Prequal is a load balancer for distributed multi-tenant systems, that aims to minimize real-time request latency in presence of heterogenous server capacities and non-uniform, time-varying antagonist load. In this article, we will explore an AI assisted implementation of this algorithm using Python's FastAPI. FastAPI is a popular web framework for building APIs with Python and has been optimized to be on par with NodeJS and Go (using libraries like Starlette and Pydantic).
                </p>
                <p style={{backgroundColor: "orange", padding: '10px', borderRadius: '5px'}}>
                    OpenPrequal is an experimental project that I worked on in my spare time. There are several potential performance optimizations that remain unexplored as of today.
                </p>
                <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none", marginRight: "10px" }} href="https://github.com/Pranshu258/OpenPrequal">
                    <button className="btn btn-danger">
                        <i className="fab fa-google"></i>
                        <b style={{ padding: "10px" }}>Google's Prequal Paper</b>
                        <i className="fas fa-external-link-alt"></i>
                    </button>
                </a>
                <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal">
                    <button className="btn btn-primary">
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
                <ul>
                    <li><a href='https://platform.openai.com/docs/models/gpt-4.1'>OpenAI GPT-4.1</a> excels at instruction following and tool calling, with broad knowledge across domains. It features a 1M token context window, and low latency without a reasoning step.</li>
                    <li><a href='https://platform.openai.com/docs/models/gpt-5'>GPT-5</a> is OpenAI's flagship model for coding, reasoning, and agentic tasks across domains. GPT-5 mini is a faster, more cost-efficient version of GPT-5. It's great for well-defined tasks and precise prompts. </li>
                    <li><a href='https://platform.openai.com/docs/models/o3'>OpenAI o3</a> is a well-rounded and powerful model across domains. It excels at technical writing and instruction-following, and can be used to think through multi-step problems that involve analysis across text, code, and images. o3-mini is a smaller model alternartive to o3.</li>
                    <li><a href='https://www.anthropic.com/claude/sonnet'>Anthropic Claude Sonnet</a> is a hybrid reasoning model and is a powerful choice for agentic coding, and can complete tasks across the entire software development lifecycle—from initial planning to bug fixes, maintenance to large refactors.</li>
                </ul>
                <p>
                    Reasoning models are LLMs that have been fine tuned to break complex problems into smaller steps, employing chain of thought reasoning and other multi-step decision making strategies, before generating the final output. It has been observed that such models perform better at complex tasks that involve mathematical and logical reasoning, such as programming. 
                </p>
                <p>
                    That being said, even reasoning LLMs are not perfect, they would often get stuck into fixing a syntax error, rewriting the file again and again, while making no progress, or sometimes, make it worse. As an AI agent user, it is essential to know what you want to implement, and to be able to understand and verify if the code that was generated is doing what you intended it to do.
                </p>
                <hr style={{ backgroundColor: "white" }} />
                <h2>Load Balancing using Reverse Proxy</h2>
                <p>
                    A load balancer is a system that acts as a traffic proxy and disibutes network or application traffic across endpoints on a number of severs. This helps increase the overall performance and availability of applications by reducing the burden on idividual services and distributing deamnd across different surfaces. There are many load balacing algorithms that can be used, each having there pros and cons.
                </p>
                <ul>
                    <li><b>Round Robin:</b> Distributes requests sequentially across all servers in the pool, ensuring each server receives an equal share of traffic.</li>
                    <li><b>Least Connections:</b> Routes new requests to the server with the fewest active connections, balancing the load based on current usage.</li>
                    <li><b>Weighted Round Robin:</b> Assigns more requests to servers with higher capacity by giving them a greater weight in the rotation.</li>
                    <li><b>Random:</b> Selects a server at random for each request, providing a simple but sometimes uneven distribution.</li>
                    <li><b>Least Latency:</b> Directs traffic to the server with the lowest average response time, optimizing for speed.</li>
                    <li><b>Power of Two Choices (P2C):</b> Randomly selects two servers and routes the request to the one with fewer active connections (or lower latency), combining randomness with load awareness.</li>
                    <li><b>Power of N Choices:</b> Extends P2C by randomly sampling N servers and choosing the best among them (e.g., least loaded or lowest latency), further improving load distribution in large clusters.</li>
                </ul>
                <figure>
                    <img alt="" className="img-fluid" src={reverseproxy} />
                    <figcaption>Reverse Proxy API Gateway</figcaption>
                </figure>
                <h2>Probing to reduce Queueing and Latency</h2>
                <p>
                    Prequal (Probing to reduce Queueing and Latency) is a load balacing algorithm that actively probes server load to leverage the power of N choices paradigm, extending it with asynchronous and reusable probes. It does not balance CPU load, but selects servers according to estimated latency and active requests in flight instead. Latency on the server side is defined as the time duration between the application logic receiving the request and handing the response back. The request contributes to the number of requests in flight for server during this time duration.
                </p>
                <figure>
                    <img alt="" className="img-fluid" src={openprequal} />
                    <figcaption>OpenPrequal Reverse Proxy and Load Balancer</figcaption>
                </figure>
                <p>
                    The diagram above shows the high level architecture of the OpenPrequal API gateway and load balancer. The components in green are specific to the prequal load balacing algorithm and are not triggered if a different algorithm is configured for the reverse proxy gateway. In the following sections we will discuss each component in detail.
                </p>
                <h3>Probe Scheduling and Management</h3>
                <ul>
                    <li>The reverse proxy issues a specified number of probes 'r' triggered by each request, in addition to a issuing a forced probe after a configured idle time has been exceeded, to ensure availability of recent probe responses in the pool even when no requests have arrived recently. The probing rate (probes per unit time) is proportional to the ratio of 'r' and incoming requests per second. This ensures that the probing rate remains constant irrespective of the request rate. This is intentional so that the proxy can make decisions based on the latest data, without flooding the backends with probes. See implementation <a href='https://github.com/Pranshu258/OpenPrequal/blob/b83520df5736928d1b1334b383e1d6e7bac3f8d7/src/algorithms/prequal_load_balancer.py#L84'>here</a>.</li>
                    <li>Probe destinations are sampled uniformly without replacement from the set of available servers. It also helps avoid the thundering herd phenomenon, in which a server with low estimated latency is inundatred with requests as it is seen as the best choice, which leads to request queueing and higher latency.</li>
                    <li>When responding to a probe, the RIF comes from simply checking a counter. The estimated latency is the median of the recent latencies observed at the current RIF value. The server maintains a recent history of latency binned over RIF values.</li>
                    <li>The proxy maintains a pool of probe responses to be used in server selection. Each pool element indicates the replica server that responded, the timestamp, and the load signals, i.e. current RIF and estimated latency. The pool is capped at a maximum size of 16.</li>
                </ul>
                <h3>Metrics Management</h3>
                <ul>
                    <li>Each server tracks the number of requests in flight and latency statistics, which are provided to the proxy on probe requests.</li>
                    <li>The latency is defined as the time duration between the moment when the application logic receives the request and the moment when it forwards the response to the proxy. </li>
                    <li>The request contributes one unit to the "requests in flight" metric during the duration which spans its latency (as described above).</li>
                    <li>When responding to a probe, the RIF comes from simply checking the counter. The latency is always recorded with the RIF at the time the request arrived. The latency metric in the probe response is the median of the recent latencies associated with the current RIF value. If the current value is not available is history, the median is estimated using the closest RIF value. OpenPrequal implementation also does interpolation between two closest available values if possible.</li>
                </ul>
                <hr style={{ backgroundColor: "white" }} />
                <h2>References</h2>
                <ol>
                    <li><a href='https://fastapi.tiangolo.com/'>Python FastAPI</a> - modern, fast (high-performance), web framework for building APIs with Python</li>
                    <li><a href='https://github.com/features/copilot'>GitHub Copilot</a> - AI that builds with you</li>
                    <li><a href='https://www.ibm.com/think/topics/reasoning-model'>What is a reasoning model?</a>- by Dave Bergmann, IBM</li>
                    <li><a href='https://www.ibm.com/think/topics/chain-of-thoughts'>Chain of Thoughts</a>- What is chain of thought (CoT) prompting?</li>
                    <li><a href='https://www.anthropic.com/claude/sonnet'>Anthropic Claude Sonnet</a>- Hybrid reasoning model with superior intelligence</li>
                    <li><a href='https://platform.openai.com/docs/models'>Models</a>- OpenAI Platform</li>
                </ol>
                <hr style={{ backgroundColor: "white" }} />
            </div>
        );
    }
}