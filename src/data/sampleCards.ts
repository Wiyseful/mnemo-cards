import type { Card, Deck } from "@/scheduler/types";
import { createUnstudiedCard } from "@/data/createUnstudiedCard";

export const SAMPLE_DECK_ID = "cs-fundamentals";

export const sampleDecks: Deck[] = [
    { id: SAMPLE_DECK_ID, name: "CS Fundamentals", parentDeckId: null, deletedAt: null },
];

const SAMPLE_FRONTS_AND_BACKS: [string, string][] = [
    [
        "What is the time complexity of searching a balanced binary search tree, and why?",
        "O(log n). Each comparison discards half of the remaining tree, so the number of steps grows with the tree's height, which stays around log n when it is balanced.",
    ],
    [
        "Why can a hash table lookup degrade from O(1) to O(n)?",
        "If many keys hash to the same bucket, a lookup has to walk through all of them. A bad hash function or a deliberate collision attack can put every key in one bucket.",
    ],
    [
        "What is amortized time complexity? Use a dynamic array as the example.",
        "The average cost per operation over a long sequence. Appending to a dynamic array is usually O(1), but occasionally it doubles and copies everything in O(n). Spread across all appends, that is still O(1) each.",
    ],
    [
        "What is the difference between BFS and DFS, and when would you pick each?",
        "BFS explores level by level with a queue and finds the shortest path in an unweighted graph. DFS goes as deep as possible with a stack or recursion and suits cycle detection, topological sort, and exploring every path.",
    ],
    [
        "Why doesn't Dijkstra's algorithm work with negative edge weights?",
        "It assumes a node's distance is final once it is taken from the priority queue. A negative edge found later could make a shorter path to that node, which breaks the assumption. Bellman-Ford handles negative weights.",
    ],
    [
        "What is a topological sort, and what kind of graph does it need?",
        "An ordering of nodes where every edge points from earlier to later, like ordering tasks so each one comes after its prerequisites. It only exists for a directed acyclic graph (DAG).",
    ],
    [
        "What two properties make a problem a good fit for dynamic programming?",
        "Overlapping subproblems (the same smaller problems get solved again and again) and optimal substructure (the best answer can be built from the best answers to smaller problems).",
    ],
    [
        "What is the difference between memoization and tabulation?",
        "Memoization is top-down: recursion that caches results as it goes. Tabulation is bottom-up: fill a table from the smallest subproblems up, with no recursion.",
    ],
    [
        "When does a greedy algorithm give the correct answer?",
        "When making the best local choice at each step never rules out the best overall answer (the greedy choice property), and the problem has optimal substructure. Coin change with US coins works greedily, but arbitrary coin sets do not.",
    ],
    [
        "Why is comparison-based sorting at least O(n log n)?",
        "There are n! possible orderings, and each comparison has only two outcomes. Telling n! cases apart takes at least log2(n!) comparisons, which is about n log n.",
    ],
    [
        "Quicksort vs merge sort: what are the tradeoffs?",
        "Quicksort sorts in place and is usually faster in practice thanks to cache locality, but it can hit O(n^2) with bad pivots and is not stable. Merge sort is always O(n log n) and stable, but needs O(n) extra memory.",
    ],
    [
        "What does it mean for a sorting algorithm to be stable?",
        "Items with equal keys keep their original relative order. That matters when you sort by one field and then by another, like sorting by name and then by grade.",
    ],
    [
        "What is a heap, and what is it used for?",
        "A complete binary tree where every parent is smaller (min-heap) or larger (max-heap) than its children. It gives O(1) access to the min or max and O(log n) insert and remove, which makes it the usual priority queue.",
    ],
    [
        "What is a trie, and when is it better than a hash table?",
        "A tree where each edge is one character, so words that share a prefix share a path. It is better for prefix searches and autocomplete, which a hash table cannot do efficiently.",
    ],
    [
        "What does union-find (disjoint set union) do, and what makes it fast?",
        "It tracks which items belong to the same group and can merge groups. Path compression and union by rank make each operation almost O(1) (inverse Ackermann time).",
    ],
    [
        "What is the difference between P and NP?",
        "P problems can be solved in polynomial time. NP problems have answers that can be checked in polynomial time. Whether every quickly checkable problem is also quickly solvable (P = NP) is unsolved.",
    ],
    [
        "What does it mean for a problem to be NP-complete?",
        "It is in NP, and every other NP problem can be reduced to it in polynomial time. A fast algorithm for one NP-complete problem, like SAT or the traveling salesman decision problem, would solve all of them.",
    ],
    [
        "What is the halting problem?",
        "The question of whether a program will eventually stop on a given input. Turing proved no general algorithm can answer it for every program, so some questions about programs are undecidable.",
    ],
    [
        "What is the difference between a process and a thread?",
        "A process has its own memory space. Threads inside the same process share memory, which makes them cheaper to create and quicker to communicate, but also exposes them to race conditions.",
    ],
    [
        "What is a race condition?",
        "A bug where the result depends on the timing of threads touching shared data. Two threads both reading a counter as 5 and both writing 6 loses one increment.",
    ],
    [
        "What four conditions must all hold for a deadlock?",
        "Mutual exclusion, hold and wait, no preemption, and circular wait. Breaking any one prevents deadlock, for example by always taking locks in the same order.",
    ],
    [
        "What is the difference between a mutex and a semaphore?",
        "A mutex lets one thread into a critical section at a time and is released by the thread that took it. A semaphore holds a count, so it can let N threads in, and any thread can signal it.",
    ],
    [
        "What is virtual memory?",
        "Each process gets its own address space that the OS maps onto physical RAM in pages. It isolates processes from each other and lets programs use more memory than is physically installed by paging to disk.",
    ],
    [
        "What happens on a page fault?",
        "A program touches a page that isn't in RAM. The CPU traps to the OS, which loads the page from disk (evicting another if needed), updates the page table, and retries the instruction.",
    ],
    [
        "What is a TLB, and why does it matter?",
        "The translation lookaside buffer caches recent virtual-to-physical address translations. Without it, every memory access would also need extra memory reads to walk the page table.",
    ],
    [
        "What is a context switch, and why is it expensive?",
        "The CPU saves one thread's registers and state and loads another's. It costs direct time and also leaves caches and the TLB full of the old thread's data.",
    ],
    [
        "Why is the stack faster than the heap for memory allocation?",
        "Stack allocation just moves a pointer, and memory is freed automatically when the function returns. Heap allocation has to find a free block, track it, and free it later by hand or with a garbage collector.",
    ],
    [
        "What is cache locality, and what are its two types?",
        "Programs run faster when they reuse nearby or recent data that is already in the CPU cache. Temporal locality means reusing the same data soon. Spatial locality means using data next to what you just used, like walking an array in order.",
    ],
    [
        "What happens between typing a URL and seeing the page?",
        "DNS turns the name into an IP address, the browser opens a TCP connection and does a TLS handshake, sends an HTTP request, gets HTML back, then parses it and fetches CSS, JS, and images before rendering.",
    ],
    [
        "TCP vs UDP: what is the difference?",
        "TCP is connection-based and guarantees ordered, reliable delivery with retransmission and congestion control. UDP just sends packets with no guarantees, which makes it faster and better for games, video calls, and DNS.",
    ],
    [
        "What does the TCP three-way handshake do?",
        "The client sends SYN, the server replies SYN-ACK, and the client sends ACK. Both sides agree on starting sequence numbers and confirm the other can send and receive.",
    ],
    [
        "How does HTTPS keep data private?",
        "TLS uses public-key cryptography to verify the server's certificate and agree on a shared secret, then encrypts the traffic with fast symmetric encryption using that secret.",
    ],
    [
        "What is the difference between symmetric and asymmetric encryption?",
        "Symmetric uses one shared key to encrypt and decrypt and is fast. Asymmetric uses a public key to encrypt and a private key to decrypt, which solves key sharing but is much slower.",
    ],
    [
        "Why should passwords be hashed with a salt, and with what kind of hash?",
        "A unique random salt per user means identical passwords get different hashes and precomputed rainbow tables are useless. Use a deliberately slow hash like bcrypt or Argon2, not a fast one like SHA-256.",
    ],
    [
        "What is SQL injection, and how do you prevent it?",
        "An attacker puts SQL into an input that gets pasted into a query, like ' OR 1=1 --. Prevent it with parameterized queries, so input is always treated as data and never as code.",
    ],
    [
        "What does ACID stand for in databases?",
        "Atomicity (all or nothing), Consistency (rules are never broken), Isolation (concurrent transactions don't interfere), and Durability (committed data survives a crash).",
    ],
    [
        "How does a database index speed up queries, and what does it cost?",
        "It is usually a B-tree that lets the database find rows in O(log n) instead of scanning the whole table. It costs extra storage and slows down inserts and updates, because the index must be updated too.",
    ],
    [
        "What is database normalization?",
        "Organizing tables so each fact is stored in exactly one place, which avoids duplicate data and update mistakes. The tradeoff is that reading data back often needs joins.",
    ],
    [
        "What does the CAP theorem say?",
        "When a network partition happens, a distributed system has to choose between consistency (everyone sees the same data) and availability (every request gets a response). It can't guarantee both.",
    ],
    [
        "What is eventual consistency?",
        "Replicas may briefly disagree after a write, but if no new writes arrive they will all converge to the same value. It trades immediate correctness for availability and speed.",
    ],
    [
        "What is consistent hashing used for?",
        "Spreading keys across servers so that adding or removing a server only moves a small fraction of keys, instead of reshuffling almost everything like hash mod N would.",
    ],
    [
        "What is the difference between horizontal and vertical scaling?",
        "Vertical scaling means a bigger machine (more CPU and RAM), which is simple but has a ceiling. Horizontal scaling means more machines behind a load balancer, which scales further but needs stateless design or data sharding.",
    ],
    [
        "What is a load balancer, and name two strategies it can use.",
        "It spreads incoming requests across servers so none gets overloaded. Common strategies are round robin (take turns) and least connections (send to the least busy server).",
    ],
    [
        "What is the difference between a cache-aside and a write-through cache?",
        "Cache-aside: the app checks the cache, and on a miss it reads the database and fills the cache. Write-through: every write goes to the cache and the database together, so the cache is never stale but writes are slower.",
    ],
    [
        "What is the difference between concurrency and parallelism?",
        "Concurrency is structuring a program to deal with many tasks at once, possibly by taking turns on one core. Parallelism is actually running multiple tasks at the same instant on multiple cores.",
    ],
    [
        "How does the JavaScript event loop work?",
        "JS runs on one thread. When the call stack is empty, the event loop first runs all queued microtasks (like resolved promises), then takes the next macrotask (like a timer or click) and repeats.",
    ],
    [
        "What is a closure?",
        "A function that remembers the variables from the scope where it was created, even after that outer function has returned. It is how a counter function can keep its own private count.",
    ],
    [
        "What is the difference between pass by value and pass by reference?",
        "By value gives the function a copy, so changes don't affect the caller. By reference gives it access to the original. JavaScript passes everything by value, but for objects that value is a reference, so mutations show up outside.",
    ],
    [
        "How does mark-and-sweep garbage collection work?",
        "Starting from roots like globals and the stack, it marks every object it can reach. Anything left unmarked can't be used anymore, so it gets swept and its memory reclaimed. This also handles reference cycles.",
    ],
    [
        "What is the difference between a compiler and an interpreter, and where does JIT fit?",
        "A compiler translates the whole program to machine code before running it. An interpreter runs code line by line. A JIT compiler interprets first, then compiles the hot code paths to machine code while the program runs, as V8 does for JavaScript.",
    ],
];

export const sampleCards: Card[] = SAMPLE_FRONTS_AND_BACKS.map(([front, back], index) =>
    createUnstudiedCard(String(index + 1), SAMPLE_DECK_ID, front, back),
);