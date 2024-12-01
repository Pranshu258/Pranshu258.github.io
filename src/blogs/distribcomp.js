import React from 'react';
import Sharer from "../sharer";

import Gist from 'super-react-gist';

import '../styles/fonts.css';
import '../styles/blog.css';

export default class DistribComp extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Distributed Computing with MapReduce | blog by Pranshu Gupta";
    }
    render() {
        return (
            <div className="language-go">
                <div className="row bhead">
                    <i className="fas fa-computer bigger gt1"></i>
                </div>
                <h1 className="title">Distributed Computing with MapReduce</h1>
                <p>Pranshu Gupta, Nov 29, 2024</p>
                <Sharer link={window.location.href} title={"Distributed Computing with MapReduce"}></Sharer>
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
                    One of the important goals when building a distributed system is to achieve very high performance, to the extent that it is not possible with a single system. Distributed systems have the advantage of utilizing a large number of nodes and delegating tasks among them, making them inherently faster.
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
                    The system must be designed in a way that it can either handle such failures as if they didn't happen at all, or it can have a mechanism to recover from them. We need to abstract out these things for an application developer so that she may focus on developing the business logic for the application and not waste time on handling the performance, consistency, and resilience aspects of the system. For an application developer, the system should behave like a simple monolithic system. This is where MapReduce comes into the picture, it is a framework that abstracts away the details of the distributed system and allows the developer to focus on the stuff that is important for the application.
                </p>
                <h2 className="headings">MapReduce</h2>
                <p>
                    Search engines like Google need to perform multi-hour computations on multi-terabyte data-sets regularly. Some of these computations include building a search index, or sorting, or analyzing the structure of the web. Such tasks are only practical with thousands of computers.
                </p>
                <p>
                    However, most application programmers are not experts in distributed systems. Google needed a system that made it easy for non-specialist programmers to implement applications that could run in a distributed fashion. Thus, MapReduce was born, it provided a framework that enabled programmers to build distributed applications by writing simple sequential code.
                </p>
                <h3 className="headings">Programming Model</h3>
                <p>
                    The computation takes a set of input key/value pairs and produces a set of output key/value pairs. The user of the framework can express the computation as two functions - Map and Reduce. The Map function processes a key/value pair to generate a set of intermediate key/value pairs, while the Reduce function merges all intermediate values associated with the same intermediate key.
                </p>
                <h3 className="headings">Map Execution</h3>
                <p>
                    The map invocations are distributed across multiple machines by automatically partitioning the input data into a set of M splits. The map reduce library starts several instances of the map program on a cluster of machines. Each instance of the map program processes one of the M input splits. The intermediate key/value pairs produced by the map functions are buffered in memory and periodically written to local disk.
                </p>
                <h3 className="headings">Reduce Execution</h3>
                <p>
                    The reduce workers read the buffered data from the local disk, and then sort and group the intermediate key/value pairs by the intermediate key. The set of intermediate values for each unique key are passed to the user's Reduce function. The output of the Reduce function is appended to a final output file for this reduce partition.
                </p>
                <h3 className="headings">Fault Tolerance</h3>
                <p>
                    One of the nodes, known as 'master' is resposible for assigning map/reduce tasks to other nodes. The master node keeps pinging the worker nodes periodically, and if it doesn't receive a response from a worker node for a certain period of time, it assumes that the worker node has failed and assigns its tasks to one of the other healthy nodes.
                </p>
                <p>
                    It is possible that the master node itself fails, in which case the entire computation is lost. To prevent this, the master node periodically writes checkpoints to the distributed file system. If the master node fails, a new master node is started on a different machine, which reads the last checkpoint and resumes the computation from there.
                </p>
                <h2 className="headings">Applications</h2>
                <p>
                    MapReduce has been used to implement a wide range of applications, including web indexing, data mining, log file analysis, and machine learning. It has been used to build systems that can process petabytes of data on thousands of machines.
                </p>
                <ol>
                    <li>The google search engine utilized MapReduce to build its search index. Although google has moved to new frameworks such as Percolator.</li>
                    <li>Companies like Amazon, eBay and Alibaba use the MapReduce framework to generate sales initiatives, based on user purchase history datasets, which can be huge on popular ecommerce sites.</li>
                    <li>GPU implementations of MapReduce are used to handle large datasets for machine learning and AI.</li>
                </ol>
                <h2 className="headings">Conclusion</h2>
                <p>
                    The MapReduce framework was introduced by Google in 2004, and has since been implemented in many other systems, including Apache Hadoop, which is an open-source implementation of the MapReduce framework. Hadoop is widely used in industry and academia for processing large datasets. The framework has also inspired other distributed computing frameworks, such as Apache Spark, which is designed to be faster and more flexible than MapReduce.
                </p>
                <a target='_blank' href="https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf"><button className="btn btn-danger">Original MapReduce paper  &nbsp;<i class="fa-solid fa-external-link-alt"></i></button></a> &nbsp;
                <a target='_blank' href="https://spark.apache.org/"><button className="btn btn-danger">Apache Spark &nbsp;<i class="fa-solid fa-external-link-alt"></i></button></a>
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