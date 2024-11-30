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

A database system can prevent these anomalies by implemeting different levels of transaction isolation. However, to prevent incomplete or temporary writes from propagating over transaction boundaries, we need additional coordination and synchronization, which negatively impacts performance.

## Isolation Levels
The weakest isolation level is read uncommmitted, which allows dirty reads, non-repeatable reads, and phantom reads. The strongest isolation level is serializable, which prevents all anomalies. The other isolation levels are read committed, repeatable read, and snapshot isolation.

### Read Committed
In the read committed isolation level, a transaction can only read committed data. However, it is not guaranteed that the data will remain the same if the trasaction attempts to read the same data record once again at a later stage. This isolation level prevents dirty reads, but allows non-repeatable reads and phantom reads.

### Repeatable Read
In the repeatable read isolation level, a transaction can read the same data multiple times and get the same result each time. This isolation level prevents dirty reads and non-repeatable reads, but allows phantom reads.

### Snapshot Isolation
Some databases use snapshot isoolation, under which a transaction can observe the state changes performed by all transactions that were committed before the transaction started. The snapshot cannot change during transaction execution. The trasaction commits only if the values it has modified did not change while it was executing. Otherwise, the transaction is rolled back.

If two transactions try to modify the same data, the second transaction will be rolled back. While dirty reads and non-repeatable reads are avoided, a write skew is possible under snapshot isolation. If two transactions read from local state, modify independent records, preserve local invariants, and commit, it is possible that the global invariants are violated.

### Serializable
Serializability is the strongest isolation level. A schedule is said to be **serial** when the transactions in it are executed completely independently and without any interleaving i.e. one transaction is executed completely before the next transaction starts. However, serializability significantly limits the system throughput and is not suitable for high-performance applications.

Another approach is to use **serializable** schedules, which are not necessarily serial, but are guaranteed to be equivalent to some serial schedule. In other words, they could have interleaved transactions, but they produce the same result as if we executed a set of transactions one after another in some order. Serializable schedules are more flexible than serial schedules and can be used in high-performance applications.

## Optimistic Concurrency Control
Optimistic concurrency control assumes that conflicts are rare and that transactions can be executed concurrently without any coordination. When a transaction commits, the database system checks if the data it read has changed since it started. If the data has changed, the transaction is rolled back. 


`;

export default class TransIsol extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Transaction Isolation in Database Systems | blog by Pranshu Gupta";
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
                    Transactional database systems allow different isolation levels. An isolation level specifies how and when parts of the transaction can and should become visible to other transactions that are being executed at the same time. This article will explore the different isolation levels and how they affect the transactional behavior of the database system.<br></br>
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <ReactMarkdown remarkPlugins={[remarkGfm]} children={markdown}></ReactMarkdown>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">References</h3>
                <ol>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/database-transactions-optimistic-concurrency">https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/database-transactions-optimistic-concurrency</a></li>
                    <li>Database Internals by Alex Petrov | Chapter 5: Transaction Processing and Recovery</li>
                </ol>
                <br></br>
            </div>
        )
    }
}