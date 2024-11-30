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

### Serializable Trasactions
Serializability is the strongest isolation level. A schedule is said to be **serial** when the transactions in it are executed completely independently and without any interleaving i.e. one transaction is executed completely before the next transaction starts. However, serializability significantly limits the system throughput and is not suitable for high-performance applications.

Another approach is to use **serializable** schedules, which are not necessarily serial, but are guaranteed to be equivalent to some serial schedule. In other words, they could have interleaved transactions, but they produce the same result as if we executed a set of transactions one after another in some order. Serializable schedules are more flexible than serial schedules and can be used in high-performance applications.

## Optimistic Concurrency Control
Optimistic concurrency control assumes that conflicts are rare and that transactions can be executed concurrently without any coordination. When a transaction commits, the database system checks if the data it read has changed since it started. If the data has changed, the transaction is rolled back. 

Generally,transacttions execution is split into three phases: read phase, validation phase, and write phase. 
1. **Read Phase**: The transaction executes its steps in its own private context, without making any of the changes visible to other transactions. After this step, both the read set and the write set of the transactioon are known.
2. **Validation Phase**: Read and writes sets of concurrent transaction are checked for presence of possible conflicts between their operations that might violate serializability. If a conflict is detected, the private context of the transaction is cleared and read phase is restarted.
3. **Write Phase**: If the transaction passes the validation phase, it can write the changes from its private context to the database and commit.

## Multi-Version Concurrency Control
Multi-version concurrency control (MVCC) is a way to achieve transactional consistency in database manmagement systems by allowing multiple record versionsand using monotinically incremented transaction IDs or timestamps. This allows reads and writes to proceed with a minimal coordination on the storage level, since reads can continue accessing older values until new ones are committed.

## Pessimistic Concurrency Control
Pessimistic oncurrency control schemes are more conservative and determine transaction conflicts while they are running and block or abort the execution. 

### Lock Free Pessimistic Concurrency Control
One of the approaches is timestamp ordering, where each transaction is assigned a timestamp. It is ensured that transactions are executed only if there is no committed transaction with a higher timestamp. The transaction manager keeps track of the 'max_write_timestamp' and 'max_read_timestamp' for each data item. 

Read operations that attempt to read a value with a timestamp lower than the 'max_write_timestamp' are blocked, since there is already a newer value, allowing this operation would violate the transaction order. Similarly, write operations that attempt to write a value with a timestamp lower than the 'max_read_timestamp' are blocked.

However, write operations that attempt to write a value with a timestamp lower than the 'max_write_timestamp' are allowed, since we can safely ignore the write operation if there is a newer value.

As soon as read or write operations are performed, the corresponding maximum timestamp values are updated. Aborted transactions restart with a new timestamp, otherwise they will be aborted again.

### Lock based Pessimistic Concurrency Control
Another approach is to use locks to prevent conflicts. A transaction that wants to read or write a data item must first acquire a lock on that item. If the lock is not available, the transaction is blocked until the lock is released. If the lock is not released with in a configured timeout, the transaction is aborted.

#### Two-Phase Locking
In two-phase locking, a transaction acquires all the locks it needs before it starts executing (growing phase) and releases all the locks when it commits or aborts (shrinking phase). This ensures that no other transaction can access the locked data until the transaction is completed.
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
                <br></br>
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