import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';

import openprequal from '../images/openprequal/openprequal.svg';
import { FaArrowUpRightFromSquare as FaExternalLinkAlt, FaGithub, FaGoogle, FaDiagramProject as FaHexagonNodes } from 'react-icons/fa6';
import { MdArrowOutward } from "react-icons/md";
import { TbLoadBalancer } from "react-icons/tb";

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
                    <TbLoadBalancer className="bigger gt1" />
                </div>
                <h1 className="title">Coding YouTube's load balancer using GitHub Copilot</h1>
                <p>Pranshu Gupta, September 14, 2025</p>
                <Sharer className="sharer" link={window.location.href} title={"Coding YouTube's load balancer using GitHub Copilot"}></Sharer>

                <h2>Introduction</h2>
                <p>
                    YouTube is the world's largest video sharing platform, where anyone can upload, watch and share videos for free. Over 100 hours of video content is uploaded every minute, a mind bending amount of content, ranging from adorable cats to deep scientific explainations. Load balancing is a critical component of any highly scalable service like YouTube. Google uses an algorithm that it calls <b>Prequal</b>, an abbreviation for "Probing to reduce Queueing and Latency", for load balacing services that make up the YouTube platform.
                </p>
                <p>
                    Prequal is a load balancer for distributed multi-tenant systems, that aims to minimize real-time request latency in presence of heterogenous server capacities and non-uniform, time-varying antagonist load. In this article, we will explore an AI assisted implementation of this algorithm using Python's FastAPI. FastAPI is a popular web framework for building APIs with Python and has been optimized to be on par with NodeJS and Go (using libraries like Starlette and Pydantic).
                </p>
                <p style={{ backgroundColor: "orange", padding: '10px', borderRadius: '5px' }}>
                    OpenPrequal is an experimental, personal project. FastAPI is very performant, but a Go implementation could still offer lower latency and higher throughput. With additional engineering effort, the Python version here can also be further optimized.
                </p>
                <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none", marginRight: "10px" }} href="https://github.com/Pranshu258/OpenPrequal">
                    <button className="btn btn-danger">
                        <FaGoogle style={{ marginRight: '10px' }} />
                        <b style={{ padding: "10px" }}>Google's Prequal Paper</b>
                        <FaExternalLinkAlt style={{ marginLeft: '10px' }} />
                    </button>
                </a>
                <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal">
                    <button className="btn btn-primary">
                        <FaGithub style={{ marginRight: '10px' }} />
                        <b style={{ padding: "10px" }}>OpenPrequal on GitHub</b>
                        <FaExternalLinkAlt style={{ marginLeft: '10px' }} />
                    </button>
                </a>
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
                <p>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal/blob/main/src/algorithms/prequal_load_balancer.py">
                    <b>Prequal Implementation <MdArrowOutward style={{ marginLeft: '3px', marginBottom: '2px' }}/></b>
                    </a>
                </p>
                <h3>Probe Management</h3>
                <ul>
                    <li>The reverse proxy issues a specified number of probes 'r' triggered by each request, in addition to a issuing a forced probe after a configured idle time has been exceeded, to ensure availability of recent probe responses in the pool even when no requests have arrived recently. The probing rate (probes per unit time) is proportional to the ratio of 'r' and incoming requests per second. This ensures that the probing rate remains constant irrespective of the request rate. This is intentional so that the proxy can make decisions based on the latest data, without flooding the backends with probes.</li>
                    <li>Probe destinations are sampled uniformly without replacement from the set of available servers. It also helps avoid the thundering herd phenomenon, in which a server with low estimated latency is inundatred with requests as it is seen as the best choice, which leads to request queueing and higher latency.</li>
                    <li>When responding to a probe, the RIF comes from simply checking a counter. The estimated latency is the median of the recent latencies observed at the current RIF value. The server maintains a recent history of latency binned over RIF values.</li>
                    <li>The proxy maintains a pool of probe responses to be used in server selection. Each pool element indicates the replica server that responded, the timestamp, and the load signals, i.e. current RIF and estimated latency. The pool is capped at a maximum size of 16.</li>
                </ul>
                <p>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal/blob/main/src/core/probe_manager.py">
                    <b>Probe Manager Implementation <MdArrowOutward style={{ marginLeft: '3px', marginBottom: '2px' }}/></b>
                    </a>
                </p>
                <h3>Metrics Management</h3>
                <ul>
                    <li>Each server tracks the number of requests in flight and latency statistics, which are provided to the proxy on probe requests.</li>
                    <li>The latency is defined as the time duration between the moment when the application logic receives the request and the moment when it forwards the response to the proxy. </li>
                    <li>The request contributes one unit to the "requests in flight" metric during the duration which spans its latency (as described above).</li>
                    <li>When responding to a probe, the RIF comes from simply checking the counter. The latency is always recorded with the RIF at the time the request arrived. The latency metric in the probe response is the median of the recent latencies associated with the current RIF value. If the current value is not available is history, the median is estimated using the closest RIF value. OpenPrequal implementation also does interpolation between two closest available values if possible.</li>
                </ul>
                <p>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal/blob/main/src/core/metrics_manager.py">
                    <b>Metrics Manager Implementation <MdArrowOutward style={{ marginLeft: '3px', marginBottom: '2px' }}/></b>
                    </a>
                </p>
                
                <h3>Heartbeat Client</h3>
                <p>
                    The heartbeat client is a module within the backend and it is responsible for sending periodic heartbeats to the proxy server. The heartbeat request includes the current metrics state of the backend. The metrics state is used to update the backend state in the registry. The proxy maintains the timestamps for the most recent heartbeat and marks the backend unhealthy if the heartbeat is older than a configured threshold. Unhealthy backends are not used by the load balancer algorithm for request handling.

                    In Prequal load balancer, probes also update the backend state, in addition to the heartbeats.
                </p>
                <p>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal/blob/main/src/core/heartbeat_client.py">
                        <b>Heartbeat Client Implementation <MdArrowOutward style={{ marginLeft: '3px', marginBottom: '2px' }}/></b>
                    </a>
                </p>
                <h3>Backend Registry</h3>
                <p>
                    The backend registry is the component that maintains the backend server states, including health, along with recent latencies and requests in flight obtained from probes and heartbeats. OpenPrequal supports both in-memory and redis backend registry. The in-memory registry should only be used with single uvicorn workers, because each worker will have its own view of the registry and it's own probe tasks, which might not capture the metrics across all backend workers. However, Redis based backend registry centralizes the backend state, so that all workers have a consistent view, making it suitable for multiple workers for both proxy server and backend servers.
                </p>
                <p>
                    Multiple workers with in-memory registry is problematic because the backends might not register with some of the workers, resulting in failures if such workers handle the incoming request. This happens because the backend registration process in OpenPrequal is based on heartbeats, not configuration (unlike some other load balancing systems, such as YARP).  
                </p>
                <p>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none", marginRight: "10px" }} href="https://github.com/Pranshu258/OpenPrequal/blob/main/src/core/backend_registry.py">
                        <b>In Memory Registry Implementation <MdArrowOutward style={{ marginLeft: '3px', marginBottom: '2px' }}/></b>
                    </a>
                    <br></br>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal/blob/main/src/core/redis_backend_registry.py">
                        <b>Redis Registry Implementation <MdArrowOutward style={{ marginLeft: '3px', marginBottom: '2px' }}/></b>
                    </a>
                </p>
                
                <hr style={{ backgroundColor: "white" }} />
                <h2>Benchmarking</h2>
                <p>
                    Locust and Vegeta are two polpular load testing frameworks. I found that for benchmarking load balacing algorithms, where you mainly care about the number of requests per second, Vegeta is much simpler to configure and gives similar results as Locust. Locust is more appropriate when you want to control the number of users and simulate their behavior, rather than the number of requests. 
                </p>
                <p>
                    After extensive testing with Locust, I found that Prequal is not better than round robin and other simpler load balacing algorithms if the number of backend servers is low. It performs marginally better when the system has 100 or more backend servers across which the proxy needs to load balance.  
                </p>
                <table className="development-timeline-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <caption>Metrics at 1200 RPS vegeta attack for 5 seconds, with single proxy worker, and 100 single worker heterogeneous backend servers, with local redis registry, on a MacBook Pro M3 Pro (latencies in ms). Vegeta configured as default (30s client timeout). Performance and success rate degrades rapidly with higher RPS. Increasing the number of proxy workers allows higher RPS.</caption>
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }} >
                                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Algorithm</th>
                                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Average Latency</th>
                                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>P50 Latency</th>
                                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>P95 Latency</th>
                                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>P99 Latency</th>
                                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Max Latency</th>
                                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Success Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }} className="metric">Least Latency</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>24045</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>26165</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>29706</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>30000</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>30001</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>96.76 %</td>
                            </tr>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }} className="metric">Least Latency (P2C)</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>21883</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>25031</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27306</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27437</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>30003</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>95.33 %</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }} className="metric">Least RIF</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>22455</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>24696</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>28587</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>28985</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>29169</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>100 %</td>
                            </tr>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }} className="metric">Least RIF (P2C)</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>24987</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27098</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>30000</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>30000</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>30003</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>93.41 %</td>
                            </tr>
                            <tr style={{ fontWeight: 'bold' }}>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }} className="metric">Prequal</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>22975</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>25396</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27042</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27209</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27423</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>100 %</td>
                            </tr>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }} className="metric">Random</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>22806</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>25348</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27475</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>27612</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>29437</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>99.63 %</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }} className="metric">Round Robin</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>23522</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>26182</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>28179</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>28442</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>28746</td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>99.91 %</td>
                            </tr>
                        </tbody>
                </table>
                <p>
                    As we can see in the table above, Prequal and Least RIF perform marginally better than other algorithms under heavy load (similar claim was made by Google in the original paper). However, the performance gap between Prequal and others is modest compared to results shown by Google research team. It could be because of the benchmarking test setup itself and the gaps may widen if we further scale out the backend servers. Also, all the tests I did were done on a single machine, i.e. all the backend servers and the proxy servers were running on the same hardware, which meant that if one of the servers consumed more resources, less were available for others. I tried testing with isolated deployments on Azure, but could not create 100 independent servers due to quota limits for the free tier. 
                </p>
                <p>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none", marginRight: "10px" }} href="https://github.com/Pranshu258/OpenPrequal/tree/main/scripts">
                        <b>Benchmarking Scripts</b>
                    </a>
                    <br></br>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/OpenPrequal/tree/main/results">
                        <b>More Benchmarking Results</b>
                    </a>
                </p>
                <hr style={{ backgroundColor: "white" }} />
                <h2>Agent Assisted Coding</h2>
                <p>
                    For this project, I relied entirely on VS Code and GitHub Copilot, guiding the agent by specifying the requirements and desired changes, while making very few manual code edits myself. Most of my prompts were handled by OpenAI's GPT-4.1, with occasional use of GPT-5 mini, o3-mini, and Anthropic Claude Sonnet for tasks where GPT-4.1 did not perform as well. This is expected, since GPT-4.1 is a non-reasoning model and may not match the performance of reasoning models like o3 and GPT-5 on more complex tasks.
                </p>
                <ul>
                    <li><a href='https://platform.openai.com/docs/models/gpt-4.1'>OpenAI GPT-4.1</a> excels at instruction following and tool calling, with broad knowledge across domains. It features a 1M token context window, and low latency without a reasoning step.</li>
                    <li><a href='https://platform.openai.com/docs/models/gpt-5'>GPT-5</a> is OpenAI's flagship model for coding, reasoning, and agentic tasks across domains. GPT-5 mini is a faster, more cost-efficient version of GPT-5. It's great for well-defined tasks and precise prompts. </li>
                    <li><a href='https://platform.openai.com/docs/models/o3'>OpenAI o3</a> is a well-rounded and powerful model across domains. It excels at technical writing and instruction-following, and can be used to think through multi-step problems that involve analysis across text, code, and images. o3-mini is a smaller model alternartive to o3.</li>
                    <li><a href='https://www.anthropic.com/claude/sonnet'>Anthropic Claude Sonnet</a> is a hybrid reasoning model and is a powerful choice for agentic coding, and can complete tasks across the entire software development lifecycle-from initial planning to bug fixes, maintenance to large refactors.</li>
                </ul>
                <p>
                    Reasoning models are LLMs that have been fine tuned to break complex problems into smaller steps, employing chain of thought reasoning and other multi-step decision making strategies, before generating the final output. It has been observed that such models perform better at complex tasks that involve mathematical and logical reasoning, such as programming.
                </p>
                <p>
                    That being said, even reasoning LLMs are not perfect, they would often get stuck into fixing a syntax error, rewriting the file again and again, while making no progress, or sometimes, make it worse. As an AI agent user, it is essential to know what you want to implement, and to be able to understand and verify if the code that was generated is doing what you intended it to do.
                </p>
                <h3>Workflow</h3>
                <p>
                    This was made possible by more than a thousand prompts across several months. The table below describes the evolution of the project, starting with a simple reverse proxy gateway and ending with a benchmarking setup, with many improvements and bug fixes along the way. Often, the code generated by the model is not optimized for the scenario, and requires iterative refinement and careful review.
                    My workflow typically followed these steps:
                </p>
                <ol>
                    <li><b>Define the requirement:</b> Clearly describe the feature or fix needed, often referencing specific files or functions.</li>
                    <li><b>Prompt the agent:</b> Use concise, targeted prompts in VS Code, sometimes including code snippets or error messages.</li>
                    <li><b>Review the output:</b> Carefully inspect the generated code for correctness, efficiency, and alignment with the project architecture.</li>
                    <li><b>Test and debug:</b> Run the code, observe behavior, and provide feedback to the agent for further refinement if needed.</li>
                    <li><b>Iterate:</b> Repeat the process, breaking down complex tasks into smaller steps, until the desired outcome is achieved.</li>
                </ol>
                <h3>Timeline</h3>
                <p>
                    Over six phases the project moved from basic reverse-proxy setup, metrics and testing to building an extensible load-balancer and the Prequal algorithm with health monitoring and a backend registry; it was then optimized (off-path probing, caching, concurrency improvements), expanded to support multiple selection strategies and benchmarking, testing and deployment automation, and finally integrated Redis, better health checks, and refined metrics and monitoring.
                </p>
                <table className="development-timeline-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Phase</th>
                            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Timeline</th>
                            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Highlights</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                                <strong>Initial Foundation</strong>
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>4 months ago</td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                                Project setup, reverse proxy, basic metrics, tests and docs.
                            </td>
                        </tr>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}><strong>Core Load Balancing Development</strong></td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>5 weeks ago</td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                                Core load-balancer, probe manager, RIF/latency metrics, Prequal implementation.
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}><strong>Optimization and Refinement</strong></td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>3-4 weeks ago</td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                                Performance: off-path probes, caching, concurrency fixes, load-testing tools.
                            </td>
                        </tr>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}><strong>Algorithm Expansion</strong></td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>2-3 weeks ago</td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                                Added selection strategies (Least Latency, Least RIF, P2C, Random, RR) and analysis.
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}><strong>Production Readiness</strong></td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>2 weeks ago</td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                                Docker, profiling, CI/tests, formatting and docs.
                            </td>
                        </tr>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}><strong>Further Optimizations</strong></td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>Last 2 weeks</td>
                            <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                                Redis registry, improved health checks, lighter TTLs, and benchmarking docs.
                            </td>
                        </tr>
                    </tbody>
                </table>
                <hr style={{ backgroundColor: "white" }} />
                <h2>References</h2>
                <ol>
                    <li><a href='https://fastapi.tiangolo.com/'>Python FastAPI</a> - modern, fast (high-performance), web framework for building APIs with Python</li>
                    <li><a href='https://github.com/features/copilot'>GitHub Copilot</a> - AI that builds with you</li>
                    <li><a href='https://www.ibm.com/think/topics/reasoning-model'>What is a reasoning model?</a>- by Dave Bergmann, IBM</li>
                    <li><a href='https://www.ibm.com/think/topics/chain-of-thoughts'>Chain of Thoughts</a>- What is chain of thought (CoT) prompting?</li>
                    <li><a href='https://www.anthropic.com/claude/sonnet'>Anthropic Claude Sonnet</a>- Hybrid reasoning model with superior intelligence</li>
                    <li><a href='https://platform.openai.com/docs/models'>Models</a>- OpenAI Platform</li>
                    <li><a href='https://dotnet.github.io/yarp/index.html'>YARP</a>- Yet Another Reverse Proxy</li>
                    <li><a href='https://aws.amazon.com/what-is/load-balancing/'>AWS</a> - What is Load Balancing?</li>
                    <li><a href='https://github.com/tsenart/vegeta'>Vegeta</a> - A versatile HTTP load testing tool</li>
                    <li><a href='https://locust.io/'>Locust</a> - A modern load testing framework</li>
                    <li><a href='https://www.cloudflare.com/learning/performance/what-is-load-balancing/'>Cloudflare</a> - What is Load Balancing?</li>
                </ol>
                <hr style={{ backgroundColor: "white" }} />
            </div>
        );
    }
}