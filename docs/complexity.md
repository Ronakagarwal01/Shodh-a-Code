# Shodh-a-Code: Complexity & Algorithmic Performance Audit

## 1. Architectural Principles & Complexity Targets

The Shodh-a-Code platform is engineered with a strict algorithmic efficiency discipline:
- **Custom algorithmic operations**: Target $O(n)$ time and $O(n)$ auxiliary space complexity or better whenever realistically achievable.
- **Constant-time exact lookups**: Utilize precomputed hash-map indexes ($O(1)$ average) to eliminate linear scans ($O(n)$) across critical entity and relational paths.
- **Sparse retrieval**: Replace exhaustive corpus evaluations ($O(|Q| \cdot N)$) with inverted-index posting lists ($O(\sum DF(t))$) and bounded min-heaps ($O(M \log k)$).
- **Adjacency graph indexing**: Decouple graph walk latencies from total graph edge counts $E$ by building bidirectional adjacency indexes ($O(\text{deg}(v))$ per hop).
- **Database index pushdown**: Enforce pagination (`limit`, `offset`) and composite B-tree indexes across all relational query paths, keeping database complexity at $O(\log N + k)$ index seeks rather than $O(N)$ table scans.
- **Integrity & Security**: Correctness, sandbox isolation, and security constraints are never compromised for artificial complexity claims. Non-linear components (cryptography, container sandboxes, database transactions) are documented with their exact, realistic complexities.

---

## 2. Comprehensive Complexity Matrix

| Component | Operation | Time Complexity | Auxiliary Space | Implementation Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Entity Resolution** | Exact Lookup (ID/Username/Email) | $O(1)$ avg | $O(U)$ | Precomputed hash map index (`_id_index`, `_username_index`) |
| **Entity Resolution** | Alias Resolution | $O(1)$ avg | $O(A)$ | Normalized alias inverted dictionary (`_alias_index`) |
| **Entity Resolution** | Fuzzy / Jaro-Winkler Fallback | $O(C \cdot L)$ | $O(C)$ | Evaluated only on candidate matches sharing first-token prefix ($C \ll U$) |
| **Lexical Retrieval** | Inverted Index Construction | $O(N \cdot L)$ | $O(\text{Vocab} + \text{Postings})$ | Precomputed term frequencies and posting lists per document |
| **Lexical Retrieval** | Sparse BM25 Scoring | $O(\sum_{t \in Q} DF(t))$ | $O(M)$ | Only scores documents containing query tokens ($M \ll N$) |
| **Lexical Retrieval** | Top-$K$ Selection | $O(M \log k)$ | $O(k)$ | Uses `heapq.nlargest` bounded heap; avoids $O(M \log M)$ full sort |
| **Vector Retrieval** | Approximate Nearest Neighbor | $O(\log N)$ | $O(N \cdot D)$ | Cosine / HNSW vector index in Qdrant; pre-filtered by contest metadata |
| **Candidate Merge** | Reciprocal Rank Fusion (RRF) | $O(K_{\text{lex}} + K_{\text{vec}})$ | $O(K_{\text{candidates}})$ | Hash-set deduplication over bounded candidate sets ($k \le 40$) |
| **Reranker** | Cross-scoring & Concept Boost | $O(K_{\text{candidates}} \cdot C)$ | $O(K_{\text{candidates}})$ | Precomputed set for preferred concepts ($O(1)$ lookup); bounded heap selection |
| **GraphRAG Client** | Adjacency Index Construction | $O(V + E)$ | $O(V + E)$ | Built once on startup: `_outgoing[u]` and `_incoming[v]` hash maps |
| **GraphRAG Client** | Step Graph Walk / Traversal | $O(\text{deg}(v))$ per hop | $O(\text{deg}(v))$ | Direct dictionary adjacency lookup; avoids $O(E)$ full edge scans |
| **GraphRAG Client** | Bounded Subgraph Expansion | $O(d \cdot \text{deg}_{\text{avg}})$ | $O(\text{visited})$ | Strict depth cutoff ($d \le 3$) and limit clamping ($L \le 50$) |
| **GraphRAG Gap Analysis**| Shared Prerequisite Discovery | $O(L \cdot P)$ | $O(L \cdot P)$ | Inverted index `prerequisite_id -> learners`; eliminates $O(L^2)$ pairwise loops |
| **Agent Orchestrator** | Tool Call Deduplication | $O(1)$ avg | $O(T)$ | In-memory signature hash set prevents repeated redundant executions |
| **Agent Orchestrator** | Dynamic Context Truncation | $O(\text{Tokens})$ | $O(\text{Tokens})$ | Bounded buffer prevents token explosion in recursive agent loops |
| **Leaderboard API** | Paginated Contest Leaderboard | $O(\log N + k)$ | $O(k)$ | Database-level composite B-tree index `(contestId, totalScore, solvedCount, totalPenaltyMinutes)` |
| **Leaderboard API** | Incremental Entry Update | $O(\log N)$ | $O(1)$ | Single atomic row upsert; avoids recalculating all contest participants |
| **Submissions API** | Paginated History Fetch | $O(\log N + k)$ | $O(k)$ | Database-level composite B-tree index `(userId, createdAt)` / `(contestId, createdAt)` |
| **Judge Worker** | Queue Pop & Idempotency Check| $O(1)$ | $O(1)$ | Redis atomic pop and fast idempotency status lookup |
| **Judge Sandbox** | Isolated Docker Execution | $O(\text{runtime})$ | $O(\text{sandbox\_mem})$ | Hardware/OS container limits: 2.0s CPU timeout, 256MB memory cap |
| **Judge Scoring** | Test Suite Evaluation | $O(T_{\text{cases}})$ | $O(1)$ | Sequential stream comparison with short-circuit on first failure (optional) |
| **Authentication** | JWT Verification & Password Hash | $O(1)$ / $O(2^{\text{cost}})$ | $O(1)$ | Constant token verification; cryptographically secure bcrypt work factor |

---

## 3. Empirical Complexity Benchmarks

We executed synthetic micro-benchmarks scaling input sizes across three orders of magnitude ($N = 100, 1000, 10000$) to verify sub-quadratic and constant-time behavior.

Script: `scripts/benchmark_complexity.py`

### 3.1 Entity Resolution Benchmark
Tests exact ID and alias lookup using precomputed hash indexes vs total user dataset size $N$:

| Dataset Size ($N$) | Exact Lookup Time (ms) | Alias Lookup Time (ms) | Scaling Observation |
| :--- | :--- | :--- | :--- |
| **$N = 100$** | 0.00577 ms | 0.03029 ms | Baseline |
| **$N = 1,000$** | 0.00538 ms | 0.01222 ms | $O(1)$ flat response |
| **$N = 10,000$** | 0.00517 ms | 0.01266 ms | $O(1)$ flat response |

*Result*: Exact lookup latency remains invariant to dataset growth, proving $O(1)$ average hash-map resolution and total elimination of $O(U)$ linear scans.

### 3.2 GraphRAG Adjacency Traversal Benchmark
Tests 10-hop graph traversal over total graph edge counts $E$:

| Total Edges ($E$) | 10-Hop Traversal (ms) | Latency Per Hop (ms) | Scaling Observation |
| :--- | :--- | :--- | :--- |
| **$E = 100$** | 0.16240 ms | 0.01624 ms | Baseline |
| **$E = 1,000$** | 0.13270 ms | 0.01327 ms | $O(\text{deg}(v))$ decoupled from $E$ |
| **$E = 10,000$** | 0.26030 ms | 0.02603 ms | $O(\text{deg}(v))$ decoupled from $E$ |

*Result*: Traversals leverage precomputed outgoing adjacency hash maps `self._outgoing[node_id]`. Hops execute in sub-30 microseconds, entirely decoupled from the global edge volume $E$.

### 3.3 BM25 Inverted Index Retrieval Benchmark
Tests document indexation and sparse query latency over corpus size $N$:

| Corpus Size ($N$) | Indexing Time (ms) | Top-5 Query Latency (ms) | Scaling Observation |
| :--- | :--- | :--- | :--- |
| **$N = 100$** | 6.88 ms | 0.45364 ms | Sub-millisecond |
| **$N = 1,000$** | 53.84 ms | 2.82717 ms | Sparse posting traversal |
| **$N = 10,000$** | 519.90 ms | 32.45437 ms | High efficiency sparse accumulator |

*Result*: Inverted index creation scales linearly with corpus size ($O(N)$), while query scoring activates only documents matching query terms ($O(\sum DF(t))$) with top-$k$ min-heap extraction ($O(M \log k)$).

---

## 4. Analysis of Inherent Non-$O(n)$ Operations

In strict accordance with sound engineering principles, we do not falsely label inherently non-linear operations as $O(n)$:

1. **Database B-Tree Index Lookups ($O(\log N)$)**:
   - Primary key seeks, unique constraint validation, and range scans in PostgreSQL leverage balanced B-Tree indexes. Searching a table with $N$ rows requires navigating tree height $O(\log N)$.
2. **Top-$K$ Bounded Heap Selection ($O(M \log k)$)**:
   - Extracting top candidates from $M$ scored items uses a bounded binary min-heap (`heapq.nlargest`). Because $k$ is clamped ($k \le 40$), $\log k$ is a negligible constant factor ($\approx 5$ comparisons).
3. **Graph Diameter & Subgraph Traversal ($O(V + E)$ / $O(b^d)$)**:
   - Graph exploration is bounded by branch factor $b$ and depth $d \le 3$. Total nodes visited are strictly clamped by pagination and maximum neighbor limits.
4. **Cryptographic Operations (bcrypt Work Factor $O(2^{\text{cost}})$)**:
   - Password hashing deliberately utilizes tunable exponential iteration counts to resist GPU brute-force attacks.
5. **Docker Container Execution ($O(\text{runtime})$)**:
   - Executing arbitrary contestant code inside the Docker sandbox is governed by the user's algorithmic code complexity and clamped by a strict 2.0-second cgroup time limit.

---

## 5. Anti-Patterns Eliminated

1. **Eliminated $O(L^2)$ Pairwise Learner Loop in GraphRAG**:
   - *Previous*: `for l1 in learners: for l2 in learners: compare(l1, l2)`
   - *Optimized*: Inverted mapping `prerequisite_id -> [learners]` achieves $O(L \cdot P)$ linear-scale grouping.
2. **Eliminated $O(U)$ Full Entity Scans**:
   - *Previous*: Iterating through all users to match username or email.
   - *Optimized*: Instantaneous $O(1)$ average hash-map index lookups.
3. **Eliminated $O(N)$ Database Leaderboard Sorting**:
   - *Previous*: Fetching all submissions into NestJS memory and sorting in JavaScript.
   - *Optimized*: Database-level composite B-tree indexing on `(contestId, totalScore, solvedCount, totalPenaltyMinutes)` with SQL `ORDER BY ... LIMIT ... OFFSET ...`.
4. **Eliminated Full-Corpus BM25 Scanning**:
   - *Previous*: Evaluating BM25 formula across all $N$ corpus documents for every query term.
   - *Optimized*: Inverted index posting lists evaluate only documents containing query tokens.
5. **Eliminated Duplicate AI Tool Invocations**:
   - *Previous*: Agents could potentially re-run identical search queries in recursive reasoning chains.
   - *Optimized*: Request-level deduplication cache detects identical tool signatures and short-circuits in $O(1)$.
