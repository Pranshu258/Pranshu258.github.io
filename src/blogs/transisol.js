import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdown = `
## Transaction Anomalies
1. A dirty read is a situation in which a transaction can read uncommitted changes from other trasactions.
2. A non-repeatable read is a situation in which a transaction reads the same row multiple times and gets different values each time.
3. A phantom read is a situation in which a transaction reads a set of rows that satisfy a certain condition, but when it reads the same set of rows again, it gets a different set of rows.
4. A lost update is a situation in which two transactions update the same row, but one of the updates is lost.
5. A dirty write is a situation in which a trsaction does a dirty read, modifies the value, and commits it.
6. A write skew occurs when each individual transaction is consistent with the database constraints, but the combination of the transactions is not.

A database system can prevent these anomalies by implemeting different levels of transaction isolation.
## Snapshot Isolation
## Optimistic concurrency control
## Multiversion concurrency control
## Pessimistic concurrency control
## Lock based concurrency control
`;

export default class TransIsol extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0)
    }

    render() {
        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-database bigger gt1"></i>
                </div>
                <h1 className="title">Transaction Isolation in Database Systems</h1>
                <p>Pranshu Gupta, Nov 28, 2024</p>
                <Sharer className="sharer" link={window.location.href} title={"Transaction Isolation in Database Systems"}></Sharer>
                <p className="introduction">
                    Transactional database systems allow different isolation levels. An isolation level specifies how and when parts of the transaction can and should become visible to other transactions that are being executed at the same time. This blog post will explore the different isolation levels and how they affect the transactional behavior of the database system.<br></br>
                    However, to prevent incomplete or temporary writes from propagating over transaction boundaries, we need additional coordination and synchronization, which negatively impacts performance.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <ReactMarkdown remarkPlugins={[remarkGfm]} children={markdown}></ReactMarkdown>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">References</h3>
                <ol>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/database-transactions-optimistic-concurrency">https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/database-transactions-optimistic-concurrency</a></li>
                </ol>
                <br></br>
            </div>
        )
    }
}