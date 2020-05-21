import React from 'react';
import Sharer from "../sharer";

import Gist from 'super-react-gist';

import '../styles/fonts.css';
import '../styles/blog.css';

export default class DistribComp extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
    }
    render() {
        return (
            <div className="language-go">
                <div className="row bhead">
                    <i className="fas fa-network-wired bigger gt1"></i>
                </div>
                <h1 className="title">Distributed Computing with MapReduce</h1>
                <p>Pranshu Gupta, May 20, 2020</p>
                <Sharer link={window.location.href} title={"Distributed Computing with MapReduce"}></Sharer>
                <br></br>
                <p className="introduction">
                    MapReduce was one of the first frameworks that democratized distributed computing, by making it easier for engineers to write applications that run on distributed systems without having distributed computing expertise. It helped Google and its developers to build highly parallelized and fault-tolerant systems, without wasting time in writing code to enable parallelism and focus on the business logic instead. In this article, we will try to understand how MapReduce helps us build such systems.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Distributed Systems</h2>
                <p>
                    A distributed system is a set of co-operating computers that are communicating with each other over the network to get some tasks done. Such systems are generally used for big websites, peer to peer file sharing platforms, big data computation, and geo-redundancy.
                </p>
                <p>
                    However, when designing a system, one should always consider building a system that runs on a single machine. A distributed system has overheads such as over the network communication and multiple failure points. Therefore, it is unnecessary to create one unless certain characteristics like high performance, fault tolerance, geo-redundancy, and isolation of components are required.
                </p>
                <p>
                    Our goal is to build an interface for a distributed system that acts as an abstraction and hides the underlying distributed architecture. We rely on Remote Procedure Calls and Multithreading as the main tools to build this abstraction. RPC helps the systems to communicate with each other over the network, while multithreading is used to implement concurrency. But why build such a system at all, what are the benefits? We shall discuss them in the following sections.
                </p>
                <h3 className="headings">Performance</h3>
                <p>
                    One of the important goals when building a distributed system is to achieve very high performance, to the extent that it is not possible with a single system. Distributed systems have the advantage of utilizing a large number of systems and delegating tasks among them, making them inherently faster.
                </p>
                <p>
                    Consider a big website like YouTube which millions of users visit every day, would it be impossible for a single machine to be able to serve that much load, definitely not. We need to use multiple machines, but what do we do with them. We may deploy the webserver on each of them, and let each of them handle a fraction of users instead of one handling them all.
                </p>
                <p>
                    However, all the webservers are now communicating with a single database, making it the bottleneck. One may suggest having the database on multiple machines as well, but it is not that straight forward. Do we write to all the databases when new information is entered? If not, which one, and from which instance would we read the data if the information is requested, because we might want to have the latest entries shown to the user.
                </p>
                <h3 className="headings">Consistency</h3>
                <p>
                    Two broad consistency guarantees are usually implemented by distributed systems - Strong and Weak. For strong consistency, the system must write a new record to all the replicated databases making all the writes quite expensive. We can avoid this cost by exercising eventual consistency, in which a new record is written to only one of the replicas and the others are periodically synced in the background, enabling all of them to have the latest information eventually.
                </p>
                <h3 className="headings">Resilience</h3>
                <p>
                    Because multiple machines are involved in a distributed system, there are many points of failure. A single computer can continuously stay up for a year, but with more than a thousand systems involved, we might have three machines failing every day. Several things can happen, one of the machines in the cluster may shut down, or the cables connecting them via the network may fault, do not forget the network switches.
                </p>
                <p>
                    The system must be designed in such a that it can either handle such failures as if they didn't happen at all, or it can have a mechanism to recover from them. We need to abstract out these things for an application developer so that she may focus on developing the business logic for the application and not waste time on handling the performance, consistency, and resilience aspects of the system. For an application developer, the system should behave like a simple monolithic system. This is where MapReduce comes into the picture, it is a framework that abstracts away the details of the distributed system and allows the developer to focus on the stuff that is important for the application.
                </p>
                <h2 className="headings">MapReduce</h2>
                <p>

                </p>
                <div>
                    <Gist url="https://gist.github.com/Pranshu258/c1ad56f279d5741a1f1adc110acaff44" file="request_headers.py" />
                </div>
                <br></br>
                <hr style={{ backgroundColor: "white" }}></hr>
                <div>
                    <svg width="48" viewBox="0 0 73 39" version="1.1" xmlns="http://www.w3.org/2000/svg" className="mit-logo site-nav__logo">
                        <polygon className="logo-color--primary" points="52.785 8.063 72.785 8.063 72.785 0.063 52.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="13.785 26.063 21.785 26.063 21.785 0.063 13.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="26.785 38.063 34.785 38.063 34.785 0.063 26.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="0.785 38.063 8.785 38.063 8.785 0.063 0.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="52.785 38.063 60.785 38.063 60.785 13.063 52.785 13.063"></polygon>
                        <polygon className="logo-color--primary" points="39.785 8.063 47.785 8.063 47.785 0.063 39.785 0.063"></polygon>
                        <polygon className="logo-color--secondary" points="40 38 48 38 48 13 40 13"></polygon>
                    </svg>
                    <br></br>
                    <p>6.824 Distributed Systems, <a href="https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB">Video Lectures (YouTube)</a>, <a href="https://pdos.csail.mit.edu/6.824/">Course Details</a></p>

                </div>
            </div >
        )
    }
}