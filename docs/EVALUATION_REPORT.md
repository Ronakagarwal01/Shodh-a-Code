# Shodh-a-Code Evaluation Report & Retrieval Comparison

## 1. Retrieval Comparison: Vector-Only vs. Hybrid vs. GraphRAG

To evaluate the necessity of multi-paradigm retrieval, two empirical scenarios were benchmarked on the Shodh-a-Code knowledge base.

### Scenario 1: Exact Software Version & Incident Retrieval
- **Query**: `"cgroup v2 memory accounting failure judge v1.4.2"`
- **Target Evidence**: `incident-2026-03-24-01` (Active post-mortem document for Judge v1.4.2 regression)
- **Vector-Only Retrieval**:
  - Top retrieved document: `res-infra-01` (Generic memory limit tutorial)
  - Failure mode: Dense vector embeddings compress specific version tokens (`v1.4.2`) and kernel parameters into generic semantic representations of "memory errors", losing exact version specificity.
- **Hybrid Retrieval (Lexical BM25 + Vector + Reranking)**:
  - Top retrieved document: `incident-2026-03-24-01` (Exact match, Rank #1)
  - Why it succeeded: BM25 assigns high IDF weights to the rare exact tokens `v1.4.2` and `cgroup`, while the cross-scoring reranker surfaces the incident with high confidence.

---

### Scenario 2: Cross-Learner Prerequisite Gap Discovery
- **Query**: `"Which learners may share a prerequisite gap despite having different failed submissions?"`
- **Context**:
  - Learner Ronak failed `prob-binary-search` with `RUNTIME_ERROR` (IndexError on upper bound).
  - Learner Priya failed `prob-rotated-sorted-array` with `TIME_LIMIT_EXCEEDED` (Infinite loop on 2-element array).
- **Vector-Only Retrieval**:
  - Top documents: Generic search articles.
  - Failure mode: A vector database only computes document-to-query cosine similarity. It cannot perform graph relational joins across two independent learners, their distinct submissions, distinct problems, concepts, and shared prerequisite nodes.
- **Neo4j GraphRAG (Multi-Hop Traversal)**:
  - Result: Discovered that `prob-binary-search` and `prob-rotated-sorted-array` both teach concepts that require prerequisite **`concept-boundary-conditions`** (*Discrete Intervals & Boundary Conditions*).
  - Traversal Path:
    `(Ronak)-[:SUBMITTED]->(sub-fail-001)-[:FOR_PROBLEM]->(prob-binary-search)-[:TEACHES]->(concept-binary-search)-[:REQUIRES]->(concept-boundary-conditions)<-[:REQUIRES]-(concept-rotated)<-[:TEACHES]-(prob-rotated)<-[:FOR_PROBLEM]-(sub-fail-002)<-[:SUBMITTED]-(Priya)`
  - Insight: Remediating discrete boundary conditions resolves both the IndexError and the TLE infinite loop.

---

## 2. Automated Test Results (10/10 Passed)

| Test # | Requirement | Expected Result | Verified Result |
|---|---|---|---|
| **TEST 1** | Normal Submission Flow | Code judged, verdict accepted, score 100 on leaderboard | **PASS** |
| **TEST 2** | Worker Failure & Recovery | Retry mechanism, incident tracked, score uncorrupted | **PASS** |
| **TEST 3** | Unauthorized Submission Access | Learner A requests Learner B's code -> 403 Forbidden | **PASS** (403 Blocked) |
| **TEST 4** | AI Question Grounding | Submission diagnosis returns inspectable evidence artifacts | **PASS** (3 Evidence Items) |
| **TEST 5** | Unanswerable Question | Out-of-domain query -> Explicit admission of insufficient evidence | **PASS** (UNKNOWN claim) |
| **TEST 6** | Hidden Test Protection | User prompts AI for hidden test cases -> Refusal | **PASS** (Disclosed denied) |
| **TEST 7** | Peer Code Protection | User prompts AI for peer submission code -> Refusal | **PASS** (Privacy enforced) |
| **TEST 8** | Hybrid Retrieval | Merged lexical and semantic search returns relevant guide | **PASS** |
| **TEST 9** | GraphRAG Multi-Hop | 7-hop knowledge graph query resolves shared prerequisite gap | **PASS** |
| **TEST 10** | AI Outage Resiliency | Simulated AI failure -> Core contest platform runs unaffected | **PASS** |
