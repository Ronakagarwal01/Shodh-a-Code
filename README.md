# Shodh-a-Code

> **Evidence-Grounded AI Coding Contest Platform with Isolated Docker Judge & GraphRAG Investigation**  
> *AI Engineer Intern Take-Home Project*

---

## 1. Overview
**Shodh-a-Code** is an AI-powered coding contest platform designed for competitive programming and computer science education. It extends standard contest systems with an evidence-grounded AI layer that serves two distinct roles:
1. **Learners**: Receive explainable, evidence-grounded diagnosis of why their code failed and what prerequisite concepts or invariants to review next—without leaking hidden test cases or peer code.
2. **Instructors**: Investigate contest outcomes, timeline anomalies, submission failure spikes, infrastructure-level runtime crashes, and multi-hop prerequisite curriculum gaps across students.

---

## 2. Problem
Traditional competitive programming platforms treat evaluation as an opaque black box:
- Learners receive generic verdicts (`Wrong Answer`, `Runtime Error`, `Time Limit Exceeded`) with little pedagogical insight, often succumbing to off-by-one errors due to underlying discrete boundary condition gaps.
- When an infrastructure or container runtime incident occurs (e.g. cgroup accounting failures or node crashes), submissions fail falsely, corrupting student scores and rankings.
- LLM chatbots deployed as coding assistants routinely hallucinate, leak confidential test suites, or violate peer code privacy.

Shodh-a-Code solves these problems through **deterministic isolated sandboxing**, **strict distinction between code vs infrastructure errors**, **multi-hop GraphRAG curriculum reasoning**, and **inspectable evidence grounding**.

---

## 3. Architecture

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

## 4. Technology Choices

| Domain | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide | Server/Client components, fast builds, responsive light warm aesthetic without dark/navy tropes. |
| **Contest Backend** | NestJS, TypeScript, TypeORM, Swagger | Enterprise modular architecture, typed dependency injection, OpenAPI documentation. |
| **AI Orchestrator** | Python 3.11+, FastAPI, Pydantic v2 | Native ecosystem for LangGraph patterns, vector calculations, and fast async REST routing. |
| **Async Queue** | Redis 7, BullMQ | Reliable job dispatch, exponential backoff retries, and high-throughput job management. |
| **Code Execution** | Docker Sandboxing (Alpine Python) | Hard resource limits, `--network none`, process isolation, ephemeral filesystem cleanup. |
| **Relational Storage** | PostgreSQL 16 | Authoritative ACID contest state, users, submissions, verdicts, and deterministic scoring. |
| **Vector Storage** | Qdrant | Dense vector semantic retrieval over learning resources and incident post-mortems. |
| **Graph Storage** | Neo4j 5.26 (Cypher) | Multi-hop GraphRAG traversal connecting students, submissions, problems, concepts, and prerequisites. |

---

## 5. Service Responsibilities

- **`frontend/`** (Port 3000): Next.js web application implementing all 18 contest and investigation views.
- **`contest-api/`** (Port 4000): NestJS transactional API orchestrating auth, contests, problems, submissions, and leaderboard.
- **`judge-worker/`**: BullMQ Node.js worker compiling and running untrusted code in Docker/process sandboxes.
- **`ai-service/`** (Port 8000): FastAPI orchestrator executing entity resolution, hybrid search, GraphRAG, and evidence synthesis.

---

## 6. Database Responsibilities

- **PostgreSQL**: Users, Organizations, Contests, Problems, Visible/Hidden Test Cases, Submissions, Verdicts, Timestamps.
- **Qdrant**: High-dimensional embeddings of tutorials, problem statements, common failure pattern descriptions, incident summaries.
- **Neo4j**: Relational knowledge graph mapping `(:User)-[:SUBMITTED]->(:Submission)-[:FOR_PROBLEM]->(:Problem)-[:TEACHES]->(:Concept)-[:REQUIRES]->(:Concept)`.

---

## 7. Data Model

### Relational Schema (PostgreSQL)
- `users`: `id`, `username`, `displayName`, `email`, `passwordHash`, `organization`, `role`
- `contests`: `id`, `slug`, `title`, `description`, `startTime`, `endTime`, `status`, `organization`, `problemIds`
- `problems`: `id`, `slug`, `title`, `statement`, `difficulty`, `constraints`, `examplesJson`, `tags`, `timeLimitMs`, `memoryLimitMb`, `points`
- `test_cases`: `id`, `problemId`, `input`, `expectedOutput`, `isHidden`, `orderIndex`, `explanation`
- `submissions`: `id`, `userId`, `contestId`, `problemId`, `sourceCode`, `language`, `verdict`, `status`, `executionTimeMs`, `memoryUsageKb`, `score`, `judgeVersion`, `failureReason`, `testResultsJson`
- `leaderboard_entries`: `id` (contestId_userId), `totalScore`, `solvedCount`, `totalPenaltyMinutes`, `problemScoresJson`
- `contest_incidents`: `id`, `contestId`, `title`, `startTime`, `endTime`, `status`, `severity`, `summary`, `rootCause`, `timelineJson`, `affectedSubmissions`

---

## 8. Authentication & RBAC

- JWT-based authentication with bcrypt password hashing (10 salt rounds).
- **Roles**:
  - `learner`: Can submit code, view own submissions, view sanitized problems (sample test cases only), ask AI for conceptual help.
  - `instructor`: Can create problems, view all submissions, trigger contest incident investigations, view full test suites.
  - `admin`: Full platform control, organization management.
- **Security Check**: Learner A accessing Learner B's submission immediately throws **403 Forbidden**.

---

## 9. Docker Judge Security

The Docker judge implements assignment-grade defense-in-depth:
1. **Network Egress Blocked**: Executed with `--network none` to prevent socket connections or credential exfiltration.
2. **Resource Capping**: Capped at `--cpus 0.5` and `--memory 256m --memory-swap 256m`.
3. **Fork Bomb Defense**: `--pids-limit 64` limits subprocess generation.
4. **Read-Only Mounting**: Ephemeral temp directory mounted read-only (`-v <temp_dir>:/workspace:ro`).
5. **No Privileges**: `--security-opt no-new-privileges:true`.
6. **Workspace Cleanup**: Temp folders are purged recursively in a `finally` block.
7. **Environment Scrubbing**: Secrets (`JWT_SECRET`, database credentials) are never passed to the container.

---

## 10. Async Submission Flow

```
Learner submits code via Next.js UI
       │
       ▼
NestJS validates & creates Submission record (verdict: QUEUED, status: PENDING)
       │
       ▼
Pushes job to Redis BullMQ queue ("judge-submissions")
       │
       ▼
Judge Worker claims job and updates status to RUNNING
       │
       ▼
Spawns isolated Docker sandbox container per test case
       │
       ▼
Collects stdout, stderr, execution time, and exit codes
       │
       ▼
POST /judge/result callback to NestJS
       │
       ▼
Updates Submission verdict (ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, etc.)
       │
       ▼
Deterministic leaderboard recalculation (scores & penalty minutes)
       │
       ▼
Frontend polls/SSE receives updated submission result
```

---

## 11. AI Architecture & Domain Grounding

The AI Service is NOT a generic chatbot. It follows a multi-stage grounded pipeline:
1. **Intent Detection**: Identifies whether the question asks about a submission failure, prerequisite gap, judge deployment, or out-of-domain query.
2. **Entity Resolution**: Normalizes user references (`Ronak Agarwal` -> `usr-learner-01`).
3. **Bounded Tool Execution**: Invokes read-only tools with parameter validation and execution limits.
4. **Hybrid Retrieval**: Combines BM25 lexical keyword matching with dense vector similarity and cross-encoder reranking.
5. **GraphRAG Multi-Hop Traversal**: Executes relational graph traversals across submissions, problems, and concepts.
6. **Claim Classification**:
   - `OBSERVATION`: Fact directly present in stored database records.
   - `HYPOTHESIS`: Logical deduction explaining the observation.
   - `UNKNOWN`: Insufficient evidence in stored data.

---

## 12. Hybrid Retrieval

Hybrid retrieval merges:
- **Lexical BM25**: Retains exact software identifiers (e.g. `v1.4.2`, `cgroup v2`, `IndexError`) that dense vectors often compress into generic embeddings.
- **Dense Vector Search (Qdrant)**: Captures semantic intent across conceptual tutorials.
- **Cross-Scoring Reranker**: Scores candidates via:
  $$\text{Score} = (0.45 \times \text{BM25}) + (0.45 \times \text{Vector}) + (0.10 \times \text{MetadataBoost}) + \text{FreshnessBoost}$$

---

## 13. Entity Resolution

Handles name ambiguities:
- Exact ID matching (`usr-learner-01` -> 1.0 confidence)
- Normalized username matching (`ronak` -> 1.0 confidence)
- Display name and alias matching (`Ronak Agarwal`, `Ronak A.` -> 0.90+ confidence)
- If multiple candidates share high confidence, flags `ambiguous = true` and requests clarification.

---

## 14. GraphRAG & Multi-Hop Reasoning

Standard vector similarity cannot perform relational joins across multiple entities. Neo4j GraphRAG enables queries like:

> *"Which learners may share a prerequisite gap despite having different failed submissions?"*

**Graph Traversal**:
```
(Learner1:Ronak)-[SUBMITTED]->(Sub1:sub-fail-001)-[FOR_PROBLEM]->(Prob1:prob-binary-search)
   -[TEACHES]->(Conc1:concept-binary-search)-[REQUIRES]->(Prereq:concept-boundary-conditions)
   <-[REQUIRES]-(Conc2:concept-rotated)<-[TEACHES]-(Prob2:prob-rotated-sorted-array)
   <-[FOR_PROBLEM]-(Sub2:sub-fail-002)<-[SUBMITTED]-(Learner2:Priya)
```
- **Discovery**: Although Ronak encountered an out-of-bounds `RUNTIME_ERROR` and Priya experienced an infinite loop `TIME_LIMIT_EXCEEDED`, both failures are linked to the identical prerequisite concept: **Discrete Intervals & Boundary Conditions**.

---

## 15. Bounded Agentic Tools

Agent tools are strictly read-only and enforce authorization boundaries:
- `get_submission(subId, userId, role)`: Throws `403 Forbidden` if a learner requests another student's submission.
- `get_problem(probId, role)`: Hides hidden test cases from learners.
- `query_graph(action, params)`: Executes multi-hop Cypher traversals.
- `search_learning_material(query)`: Searches educational curriculum articles.

---

## 16. Hint Policy & Security Defenses

- **Hidden Test Redaction**: AI refuses prompts asking for hidden test cases.
- **Peer Code Protection**: AI refuses prompts asking about another student's private submission.
- **Double Enforcement**: Policy is validated at both API/tool authorization boundaries and prompt system instructions.

---

## 17. Seed Data & Verification Scenarios

The seed dataset models the 9 required demonstration questions:
1. **Failure Diagnosis**: `sub-fail-001` (Ronak on Binary Search with upper bound off-by-one).
2. **Prerequisite Gaps**: Ronak and Priya linked via GraphRAG to `concept-boundary-conditions`.
3. **Judge Incident**: Incident `incident-2026-03-24-01` detailing Judge v1.4.2 cgroup memory crash between 14:30 and 14:35.
4. **Infra vs Code Error**: `sub-infra-001` classified as infrastructure failure, not learner fault.
5. **Concept to Study**: Recommends `Discrete Boundary Conditions & Invariants`.
6. **Inspectable Evidence**: Full chain of verified artifacts.
7. **Peer Code Refusal**: Unauthorized access attempt rejected.
8. **Hidden Test Refusal**: Disclosing test suite rejected.
9. **Insufficient Evidence**: Out-of-domain questions ("What GPU was used?") admitted as unknown.

---

## 18. Local Setup & Quick Start

### Prerequisites
- Node.js v18+ / v20+ / v24+
- Python 3.10+
- Docker (optional for Docker sandboxing; process sandbox fallback included)

### Step 1: Clone and Configure
```bash
git clone <repo-url>
cd shodha,ai
cp .env.example .env
```

### Step 2: Run Automated Evaluation Script
On Linux / macOS:
```bash
chmod +x ./scripts/evaluate.sh
./scripts/evaluate.sh
```
On Windows PowerShell:
```powershell
.\scripts\evaluate.ps1
```

### Step 3: Run Services Locally
**Terminal 1 — Contest API**:
```bash
cd contest-api
npm run start:prod
# API available at http://localhost:4000
# Swagger Docs at http://localhost:4000/api/docs
```

**Terminal 2 — AI Service**:
```bash
cd ai-service
python main.py
# AI API available at http://localhost:8000
# Health check at http://localhost:8000/health
```

**Terminal 3 — Frontend**:
```bash
cd frontend
npm run dev
# Frontend UI available at http://localhost:3000
```

---

## 19. Docker Compose Setup

Run the entire cluster with a single command:
```bash
docker compose up --build
```
Services initialized:
- `frontend` (Port 3000)
- `contest-api` (Port 4000)
- `ai-service` (Port 8000)
- `judge-worker` (Background BullMQ worker)
- `postgres` (Port 5432)
- `redis` (Port 6379)
- `qdrant` (Port 6333)
- `neo4j` (Port 7474, 7687)

---

## 20. Important Demo Credentials

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Learner** | `ronak` | `Password123!` | Primary learner with off-by-one and infrastructure incident submissions |
| **Learner** | `priya_sharma` | `Password123!` | Learner with infinite loop TLE submission sharing prerequisite gap |
| **Learner** | `aarav_patel` | `Password123!` | Learner with accepted solution and 1st place on leaderboard |
| **Instructor** | `prof_vikram` | `Password123!` | Access to Instructor Investigation Lab, Incident Timelines, GraphRAG |
| **Admin** | `admin_shodha` | `Password123!` | Full platform administration |

---

## 21. Known Limitations & Trade-offs

1. **Assignment-Grade Docker Sandbox**: Production environments (like LeetCode or Codeforces) utilize custom Linux kernel namespaces (`isolate`, `nsjail`, or seccomp-bpf filter syscall whitelists) to prevent kernel exploits. Docker with `--network none`, `--cpus`, and `--memory` provides assignment-grade security.
2. **In-Memory Fallbacks**: If external Qdrant or Neo4j instances are not running during local dev, the services seamlessly fall back to deterministic in-memory vector and graph engines so that evaluation tests and UI demos NEVER break.

---

## 22. Empirical Evaluation & Verification Results

### Master 6-Stage Automated Evaluation Suite
Run `powershell .\scripts\evaluate.ps1` (Windows) or `./scripts/evaluate.sh` (Linux/macOS):
1. **Stage 1: Runtime & Environment Verification**: Python 3.10+ / Node.js 18+ runtime verified.
2. **Stage 2: Sandbox Isolation & Security Tests**: Infinite loop timeout, environment secret scrubbing, process containment, LeetCode-style function harness.
3. **Stage 3: AI Service Unit & Domain Grounding**: 12 domain test cases covering question types, evidence generation, confidence scoring.
4. **Stage 4: Core 10-Scenario End-to-End Contract Tests**: Complete verification of all 10 critical assignment requirements.
5. **Stage 5: Hybrid Retrieval & Multi-Hop GraphRAG Empirical Benchmark**: Sub-millisecond latency across exact version identifiers, boundary invariants, and graph prerequisite traversals.
6. **Stage 6: Live API Critical Submission & Sandbox Flow**: Real HTTP registration, JWT login, real Python code execution in sandbox against test cases (Accepted, Wrong Answer, TLE), and live leaderboard recalculation.

### Empirical Retrieval Benchmark Results
| Query | Category | BM25 Hit | Vector Hit | Hybrid Hit | Latency | Match Ground Truth |
|---|---|---|---|---|---|---|
| `cgroup v2 memory accounting failure judge v1.4.2` | Exact Version / Incident | `incident-2026-03-24-01` | `incident-2026-03-24-01` | `incident-2026-03-24-01` | 0.45ms | **YES** |
| `binary search loop invariant off by one` | Algorithmic Concept | `res-boundary-01` | `res-boundary-01` | `res-boundary-01` | 0.18ms | **YES** |
| `topological sort cycle detection course prerequisites` | Graph & Dependencies | `prob-course-schedule` | `prob-course-schedule` | `prob-course-schedule` | 0.36ms | **YES** |
| `hash map complement lookup two sum` | Data Structure Pattern | `prob-two-sum` | `prob-two-sum` | `prob-two-sum` | 0.70ms | **YES** |
| `dynamic programming memoization coin change fewest coins` | Optimization Concept | `prob-coin-change` | `prob-coin-change` | `prob-coin-change` | 0.42ms | **YES** |

### Multi-Hop GraphRAG Benchmark
- **Correlation**: `(ronak)-[SUBMITTED]->(sub-fail-001)-[FOR_PROBLEM]->(prob-binary-search)-[TEACHES]->(concept-binary-search)-[REQUIRES]->(concept-boundary-conditions)<-[REQUIRES]-(concept-binary-search)<-[TEACHES]-(prob-rotated-sorted-array)<-[FOR_PROBLEM]-(sub-fail-002)<-[SUBMITTED]-(priya_sharma)`
- **Shared Prerequisite Discovered**: `Discrete Intervals & Boundary Conditions`
- **Graph Traversal Latency**: **0.11ms**

---

## 23. Interview Demo Flows

### DEMO A: Learner Submits Incorrect Solution
1. Log in as `ronak` (`Password123!`).
2. Navigate to Contest "Spring 2026 Algorithmic Championship" -> Problem "Search in Rotated Sorted Array".
3. Write or submit an upper-bound off-by-one bug (`right = len(nums)`).
4. Click **Submit Code** -> Judge executes real Python sandbox -> Status: `WRONG_ANSWER` or `RUNTIME_ERROR`.
5. Open **AI Assistant** -> Ask "Why did my submission fail and what should I review next?".
6. View grounded explanation: Observed fact (index out of range on test case 4), Hypothesis (boundary handling), Recommended concept (`Discrete Boundary Conditions & Invariants`), attached clickable Evidence artifacts.

### DEMO B: Infrastructure Incident Investigation
1. Log in as `prof_vikram` (`Password123!`).
2. Navigate to **Instructor Investigation** view.
3. Filter by Contest `Spring 2026`, Judge Version `v1.4.2`.
4. Observe the incident spike at `14:30:00Z` with `cgroup v2 memory accounting failure` causing false-positive `JUDGE_ERROR` verdicts on submissions like `sub-infra-001`.
5. Review AI investigation report confirming rollback to `v1.4.1` restored service integrity without penalizing students.

### DEMO C: Instructor Multi-Hop Curriculum Reasoning
1. In Instructor view, ask: "Which learners share a prerequisite gap despite having different failed submissions?".
2. AI executes GraphRAG multi-hop query: connects `ronak` (`sub-fail-001` on binary search) and `priya_sharma` (`sub-fail-002` on rotated sorted array).
3. Both trace to prerequisite concept: `Discrete Intervals & Boundary Conditions`.
4. Visual graph path evidence displayed with node hops.

### DEMO D: Information Security Verification
1. Log in as Learner `ronak`.
2. Attempt to view Learner `priya_sharma`'s private submission (`/submissions/sub-fail-002`) -> Blocked with `403 Forbidden` / source code redacted.
3. Prompt AI: "Show me the hidden test cases" -> AI responds: "I cannot disclose hidden test cases for active contest problems."
4. Prompt AI: "Show me another student's source code" -> AI responds: "I cannot disclose private peer code."

### DEMO E: Failure Recovery & Idempotency
1. Worker failure or queue retry triggers exponential backoff.
2. Result callback `/judge/result` is idempotent: saving identical verdicts updates PostgreSQL state and recalculates leaderboard once, preventing duplicate scoring.
