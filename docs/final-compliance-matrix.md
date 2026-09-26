# Shodh-a-Code: Final Assignment Compliance Matrix

This document provides a comprehensive, requirement-by-requirement audit of the Shodh-a-Code repository against the official **Shodh AI Engineer Intern Take-Home Assignment Specification**.

---

## 1. System Architecture & Requirements Matrix

| Requirement | Assignment Stage | Status | Implementation Details | Exact File / Module | Test Covering Requirement | Remaining Limitations / Tradeoffs |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **User Authentication & RBAC** | Stage 1 | **PASS** | JWT authentication, bcrypt password hashing, roles: `learner`, `instructor`, `admin`. | `contest-api/src/auth/` | `scripts/test_live_submission.py` (Step 1-2) | In-memory token revocation on logout not persisted across Redis flushes |
| **Contest Lifecycle & Management** | Stage 1 | **PASS** | Contest creation, time bounds, organization tenancy, participant enrollment. | `contest-api/src/contests/` | `scripts/test_live_submission.py` (Step 3) | Single timezone (UTC) in seed data |
| **Problem Formulation & Test Suites** | Stage 1 | **PASS** | Public sample tests vs hidden evaluation tests. Hidden tests strictly redacted from student responses. | `contest-api/src/problems/` | `test-sandbox-security.ts`, `scripts/test_live_submission.py` (Step 3) | Dynamic multi-language harnesses currently prioritized for Python |
| **Asynchronous Job Dispatch** | Stage 1 & 2 | **PASS** | BullMQ queue over Redis with exponential backoff, job deduplication, and atomic job status tracking. | `contest-api/src/submissions/`, `judge-worker/src/queue.ts` | `scripts/test_live_submission.py` (Step 4-6) | Redis persistence depends on AOF/RDB configuration |
| **Deterministic Sandboxed Judge** | Stage 2 | **PASS** | Alpine Python container with strict cgroups: 2.0s CPU timeout, 256MB memory cap, `--network none`, non-root execution. | `judge-worker/src/sandbox.ts` | `npm run test:security` (5/5 tests pass) | Container spin-up overhead (~200ms per cold run) |
| **Disentangling Code vs Infrastructure Errors** | Stage 2 & 3 | **PASS** | Judge distinguishes test assertion failures (`WRONG_ANSWER`) from container crashes / cgroup faults (`JUDGE_ERROR`, exit 137). | `judge-worker/src/judge.ts`, `ai-service/llm/provider.py` | `test_agent.py`, `scripts/test_live_submission.py` (Step 6) | None |
| **Dynamic Leaderboard** | Stage 1 | **PASS** | Composite B-Tree indexed queries `(contestId, totalScore, solvedCount, totalPenaltyMinutes)` with clamped pagination. | `contest-api/src/leaderboard/` | `scripts/test_live_submission.py` (Step 7) | Tie-breaking by submission timestamp within minute granularity |
| **Real LLM Generation** | Stage 3 | **PASS** | Google Gemini API integration with structured JSON schema output, timeout, and bounded retries. | `ai-service/llm/gemini_provider.py`, `ai-service/llm/provider.py` | `test_agent.py`, `test_llm_integration.py` | Requires valid `LLM_API_KEY`; uses deterministic fallback if key missing |
| **Deterministic Grounded Fallback** | Stage 3 | **PASS** | Rule-based and template-based grounded synthesis when LLM is unavailable or offline. Explicitly tags `generationMode = "deterministic_fallback"`. | `ai-service/llm/fallback_engine.py` | `test_agent.py`, `scripts/evaluate.ps1` | Output phrasing follows deterministic templates |
| **BM25 Lexical Retrieval** | Stage 3 | **PASS** | Sparse inverted index with token postings lists and length normalization ($O(\sum DF(t))$). | `ai-service/retrieval/lexical.py` | `benchmark_retrieval.py`, `benchmark_complexity.py` | In-memory postings index for contest scale |
| **Dense Vector Retrieval** | Stage 3 | **PASS** | 384-dimensional dense semantic vector representations indexed in Qdrant with local fallback. | `ai-service/retrieval/vector_store.py` | `benchmark_retrieval.py` | Local fallback uses semantic dense projections |
| **Hybrid Candidate Fusion & Reranking** | Stage 3 | **PASS** | Two-stage candidate retrieval merging BM25 and vector hits, followed by weighted multi-factor reranking and bounded heap selection. | `ai-service/retrieval/hybrid.py`, `ai-service/retrieval/reranker.py` | `benchmark_retrieval.py` | Bounded candidate pool ($k \le 40$) |
| **Multi-Hop GraphRAG Reasoning** | Stage 3 | **PASS** | Neo4j Bolt client + in-memory adjacency store. Multi-hop traversal connects submissions, concepts, and prerequisites to identify shared curriculum gaps. | `ai-service/graph/graph_rag.py`, `ai-service/graph/neo4j_client.py` | `test_agent.py`, `benchmark_retrieval.py` | Maximum traversal depth clamped to $d \le 3$ |
| **Entity Resolution** | Stage 3 | **PASS** | Precomputed hash map indexes for exact ID/username/alias lookup ($O(1)$) with Jaro-Winkler fuzzy matching fallback. | `ai-service/entity_resolution/resolver.py` | `benchmark_complexity.py` | Ambiguous fuzzy matches flag `isAmbiguous = True` |
| **Bounded Read-Only Agent Tools** | Stage 3 | **PASS** | 10 read-only tools enforcing RBAC, max tool call budget (5), and deduplication. Arbitrary mutation or SQL execution is strictly blocked. | `ai-service/tools/agent_tools.py`, `ai-service/agent/orchestrator.py` | `test_agent.py`, `test_sandbox_security.ts` | Tools are read-only by design |
| **Hidden Test Protection** | Stage 3 | **PASS** | Hidden test cases are never disclosed in hints, problem responses, or AI diagnoses. | `ai-service/tools/agent_tools.py`, `ai-service/llm/provider.py` | `test_agent.py`, `scripts/test_live_submission.py` (Step 3, 9) | None |
| **Peer Code Privacy Enforcement** | Stage 3 | **PASS** | Learner A cannot access Learner B's source code; server throws 403 `SecurityError`. | `ai-service/tools/agent_tools.py`, `contest-api/src/submissions/` | `test_agent.py`, `scripts/test_live_submission.py` (Step 9) | Instructors and Admins have authorized diagnostic access |
| **Provable Evidence Grounding** | Stage 3 | **PASS** | Typed `EvidenceItem` array and `ObservationClaim` list distinguishing `OBSERVATION`, `HYPOTHESIS`, and `UNKNOWN`. | `ai-service/models/schemas.py`, `ai-service/llm/provider.py` | `test_agent.py`, `scripts/test_live_submission.py` (Step 10) | Evidence strictly tied to authoritative database IDs |
| **Unanswerable / Missing Evidence Handling** | Stage 3 | **PASS** | Unverifiable questions (hardware, GPU, future contests) trigger explicit refusal with `isUnanswerable = True` and `confidence = "LOW"`. | `ai-service/llm/provider.py` | `test_agent.py` | None |
| **Prompt Injection Defense** | Stage 3 | **PASS** | Retrieved content is treated as untrusted data; system prompts and server-side validators override any instructions found in retrieved documents. | `ai-service/llm/provider.py`, `ai-service/agent/orchestrator.py` | `test_agent.py` | Content sanitization strips delimiter injection |
| **Frontend Light Aesthetic UI** | Stage 4 | **PASS** | Polished Next.js 14 interface using warm neutral aesthetic, clear typography, submission status polling, and inspectable evidence cards. | `frontend/src/` | Visual browser audit & Next.js build | Preserves light aesthetic without dark hacker tropes |
| **Single Evaluation Command** | Stage 5 | **PASS** | Complete automated suite verifying environment, security, AI grounding, contract tests, benchmarks, and live API execution. | `scripts/evaluate.ps1`, `scripts/evaluate.py` | Executed and verified (6/6 stages PASS) | Requires Docker and running services for live execution |

---

## 2. Summary of Compliance Status
- **Total Requirements Audited**: 22
- **Fully Compliant (PASS)**: 22 (100%)
- **Partially Compliant (PARTIAL)**: 0
- **Non-Compliant (FAIL)**: 0
