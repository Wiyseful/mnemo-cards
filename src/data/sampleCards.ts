import type { Card } from "@/scheduler/types";

function createUnstudiedCard(id: string, front: string, back: string): Card {
    return {
        id,
        front,
        back,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        dueAt: 0, // 0 = long ago, so new cards are due right away
        reviewCount: 0,
        forgetCount: 0,
        studyPhase: "New",
    };
}

export const sampleCards: Card[] = [
    createUnstudiedCard(
        "1",
        "Explain the core difference between Process and Thread in memory allocation.",
        "A process is an isolated execution environment with its own dedicated memory space (heap/stack). A thread is a lightweight unit of execution within a process that shares the parent process's heap memory but maintains its own private stack."
    ),
    createUnstudiedCard(
        "2",
        "What is the time complexity of a hash table lookup in the worst-case scenario, and why?",
        "O(n). This occurs when a poor hash function or high load factor causes massive hash collisions, forcing the system to traverse a single long linked list or tree chain (chaining strategy) at a specific bucket index."
    ),
    createUnstudiedCard(
        "3",
        "What is the primary architectural purpose of a B-Tree or B+ Tree database index?",
        "To minimize disk I/O operations. By maintaining a self-balancing, wide, and shallow tree structures with high branching factors, the system can locate any row ID in millions of records within 3 to 4 sequential disk page reads."
    ),
    createUnstudiedCard(
        "4",
        "In a relational database, what is the operational difference between an INNER JOIN and a LEFT JOIN?",
        "An INNER JOIN returns records only when there is a matching value in both tables. A LEFT JOIN returns all records from the left table, along with matching records from the right table, filling with NULL values if no match exists."
    ),
    createUnstudiedCard(
        "5",
        "Explain the concept of Idempotency in RESTful API design.",
        "An API endpoint is idempotent if making multiple identical requests has the exact same side-effect on the server as making a single request. GET, PUT, and DELETE are designed to be idempotent; POST is typically not."
    ),
    createUnstudiedCard(
        "6",
        "What is the difference between Optimistic and Pessimistic concurrency control in systems architecture?",
        "Pessimistic locking locks records immediately upon retrieval, blocking other threads until the transaction completes. Optimistic locking does not lock rows up front; instead, it validates whether the record was modified by another transaction (usually via a version number) right before writing."
    ),
    createUnstudiedCard(
        "7",
        "Describe the purpose and mechanics of a Deadlock in multithreading.",
        "A deadlock occurs when two or more threads are permanently blocked because each thread is holding a resource that the other thread requires, creating a circular dependency cycle where neither can proceed."
    ),
    createUnstudiedCard(
        "8",
        "What does the CAP Theorem state about distributed system databases?",
        "It states that a distributed system can guarantee at most two out of three characteristics simultaneously: Consistency (every read receives the most recent write or an error), Availability (every non-failing node returns a non-error response), and Partition Tolerance (the system continues to operate despite arbitrary message loss or network delays)."
    ),
    createUnstudiedCard(
        "9",
        "In networking, how does a TCP handshake establish a reliable connection?",
        "It uses a three-step synchronization sequence: 1. The client sends a SYN (Synchronize) packet. 2. The server responds with a SYN-ACK packet. 3. The client replies with an ACK (Acknowledge) packet, establishing an open socket session."
    ),
    createUnstudiedCard(
        "10",
        "What is the structural difference between an Abstract Class and an Interface in OOP?",
        "An abstract class defines an identity and shared state, allowing you to inherit instance fields and fully implemented methods (single inheritance). An interface defines a behavioral contract, requiring implementing classes to build out the methods from scratch (multiple inheritance)."
    )
];

