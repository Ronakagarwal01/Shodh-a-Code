# Shodh-a-Code System Architecture

## 1. High-Level System Architecture

```
                         ┌───────────────────────┐
                         │      Next.js UI       │
                         │ React + TypeScript    │
                         │ Warm Light Aesthetic  │
                         └───────────┬───────────┘
                                     │
                          REST / polling / SSE
                                     │
                         ┌───────────▼───────────┐
                         │       NestJS API      │
                         │ Contest / Auth / RBAC │
                         └───────┬───────┬────────┘
                                 │       │
                     ┌───────────┘       └──────────────┐
                     ▼                                  ▼
              PostgreSQL                            Redis Queue
              transactional                           │
              contest data                            ▼
                                              Judge Worker
                                                    │
                                                    ▼
                                                Docker
                                               Sandbox
                                                    │
                                                    ▼
                                             Judge Result
                                                    │
                                                    ▼
                                               PostgreSQL


                         ┌─────────────────────────┐
                         │      FastAPI AI         │
                         │ AI orchestration layer  │
                         └───────────┬─────────────┘
                                     │
                    ┌────────────────┼─────────────────┐
                    ▼                ▼                 ▼
               PostgreSQL         Qdrant            Neo4j
               structured        semantic          relationships
                 facts           retrieval          GraphRAG
                    │                │                 │
                    └────────────────┼─────────────────┘
                                     ▼
                              Hybrid Retrieval
                                     │
                                  Reranker
                                     │
                              Evidence Builder
                                     │
                              Agentic Read Tools
                                     │
                                     ▼
                                LLM Response
                                     │
                                     ▼
                           Evidence-grounded UI
```

---

## 2. Database Responsibilities & Partitioning

| Database | Responsibility | Storage Contents | Why Used |
|---|---|---|---|
| **PostgreSQL** | Authoritative Transactional Contest State | Users, Organizations, Contests, Problems, Test Cases (sample + hidden), Submissions, Verdicts, Timestamps | ACID compliance, referential integrity, deterministic leaderboard ranking. |
| **Qdrant** | Semantic Vector Retrieval | Problem statements, learning resources, curriculum tutorials, incident summaries, post-mortems | Fast similarity search over high-dimensional text embeddings. |
| **Neo4j** | Knowledge Graph & Multi-Hop Reasoning | `(User)-[:SUBMITTED]->(Submission)-[:FOR_PROBLEM]->(Problem)-[:TEACHES]->(Concept)-[:REQUIRES]->(Prerequisite)`, `(JudgeVersion)-[:EVALUATED]->(Submission)` | Graph traversal across 5+ hops to detect shared prerequisite gaps between different problems. |

---

## 3. Docker Code Judge Security Model

Submitted code is evaluated inside ephemeral Docker containers:
1. **Network Disabled**: `--network none` guarantees zero egress/ingress, blocking external command-and-control or credential exfiltration.
2. **Resource Restrictions**:
   - CPU quota: `--cpus 0.5`
   - Memory quota: `-m 256m --memory-swap 256m`
   - Process limit: `--pids-limit 64` (mitigates fork bombs)
3. **Workspace Isolation**:
   - Ephemeral directory created under host temp storage with unprivileged permissions (`0o444`).
   - Mounted into container as read-only (`-v <temp_dir>:/workspace:ro`).
   - Workspace cleaned up recursively in `finally` block.
4. **Environment Scrubbing**:
   - Host credentials, `.env`, and `JWT_SECRET` are never mounted or exposed in container environment variables.
5. **Fail-safe Fallback**:
   - When Docker daemon is not active on host, the engine falls back to a restricted process sandbox with sanitized environment and timeout enforcement.

---

## 4. Grounding & Information Security

1. **Academic Privacy**:
   - Learner A cannot access Learner B's code. Requests raise **403 Forbidden** at both API and AI tool layers.
2. **Hidden Test Integrity**:
   - Evaluation test cases are marked `isHidden = true`.
   - Sanitized problem views for learners redact inputs and outputs.
   - AI tools explicitly reject prompts requesting hidden test cases.
3. **Observation vs Hypothesis**:
   - Stored facts are labeled `OBSERVATION`.
   - Inductive explanations are labeled `HYPOTHESIS`.
   - Insufficient data triggers `UNKNOWN` and explicit admission of unanswerability.
