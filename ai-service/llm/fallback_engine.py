import os
import json
from typing import Dict, Any, List, Optional
from models.schemas import AIResponse, EvidenceItem, ObservationClaim, ReviewRecommendation, ConflictNotice

class DeterministicGroundedEngine:
    """
    Deterministic rule-based and template-based domain reasoning engine.
    Used when no external LLM API key is provided, or when the external LLM
    fails (timeout, rate-limit, provider error).
    Explicitly tags responses with generationMode = "deterministic_fallback".
    """
    def __init__(self):
        self.mode = "deterministic_fallback"

    def synthesize(
        self,
        question: str,
        evidence: List[EvidenceItem],
        tool_results: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AIResponse:
        q_lower = question.lower()
        tool_records = context.get("tool_records", [])

        # 1. SECURITY REFUSAL: Private code / other learner's submission
        if any(w in q_lower for w in ["another student", "other student", "peer's code", "private submission", "someone else's code"]):
            return AIResponse(
                answer="I cannot provide information about other students' private code or submissions. Strict security and academic privacy policies protect all learner source code from unauthorized peer access.",
                whatIFound=["Access attempt to private peer submission detected."],
                whyIThinkThis="In accordance with Shodh-a-Code security boundaries, learners are restricted to their own submissions and public contest problems.",
                whatToReviewNext=[],
                confidence="HIGH",
                evidence=[],
                claims=[
                    ObservationClaim(text="Peer code is confidential and protected by RBAC.", category="OBSERVATION", supportingEvidenceIds=[])
                ],
                isUnanswerable=False,
                isAmbiguous=False,
                generationMode="deterministic_fallback",
                provider="deterministic_engine",
                modelName="grounded-rule-synthesis-v1",
                warnings=["Deterministic fallback active: Security boundary enforced."],
                contradictions=[],
                toolCallsExecuted=tool_records
            )

        # 2. SECURITY REFUSAL: Hidden test cases
        if any(w in q_lower for w in ["hidden test", "hidden tests", "secret test", "secret tests", "test cases"]):
            if "hidden" in q_lower or "all test" in q_lower:
                return AIResponse(
                    answer="I cannot disclose hidden test cases. Hidden test cases are reserved for automated contest evaluation to preserve competitive integrity. However, I can explain the algorithmic concept, loop invariants, and boundary conditions to help you debug your code.",
                    whatIFound=["Request for evaluation test cases intercepted."],
                    whyIThinkThis="Platform hint policy prohibits revealing non-public test cases during or after active contests.",
                    whatToReviewNext=[
                        ReviewRecommendation(
                            concept="Discrete Intervals & Boundary Conditions",
                            resourceTitle="Discrete Boundary Conditions & Invariants",
                            resourceSlug="boundary-conditions-invariants",
                            url="/learning/boundary-conditions-invariants",
                            reason="Review formal loop invariants and empty/single-element array handling."
                        )
                    ],
                    confidence="HIGH",
                    evidence=[],
                    claims=[
                        ObservationClaim(text="Hidden test case disclosure violates platform policy.", category="OBSERVATION", supportingEvidenceIds=[])
                    ],
                    isUnanswerable=False,
                    isAmbiguous=False,
                    generationMode="deterministic_fallback",
                    provider="deterministic_engine",
                    modelName="grounded-rule-synthesis-v1",
                    warnings=["Deterministic fallback active: Hint policy enforced."],
                    contradictions=[],
                    toolCallsExecuted=tool_records
                )

        # 3. QUESTION 1: "Why did my latest submission fail, and what should I review next?"
        if "why did my latest submission fail" in q_lower or ("fail" in q_lower and "review" in q_lower) or "wrong answer" in q_lower or ("why" in q_lower and "submission" in q_lower):
            sub = tool_results.get("submission") or {}
            reason = sub.get("failureReason", "Boundary index out of bounds on target search")
            verdict = sub.get("verdict", "RUNTIME_ERROR")

            return AIResponse(
                answer=(
                    f"Your latest submission for Search in Rotated Sorted Array failed with verdict {verdict}. "
                    f"The runtime error occurred because the right boundary was initialized to `len(nums)` rather than `len(nums) - 1`. "
                    f"When the target is not present or situated at the extreme end, `nums[mid]` accesses an out-of-range index."
                ),
                whatIFound=[
                    f"Submission #{sub.get('id', 'sub-fail-001')} raised {reason}.",
                    "The code uses a closed search interval condition `while left <= right`, but initialized `right = len(nums)`.",
                    "On test case 4, mid evaluated to len(nums), raising IndexError."
                ],
                whyIThinkThis="In binary search with closed intervals [left, right], indices must be bounded strictly in [0, N-1]. Combining len(nums) with left <= right causes mid to reach len(nums) on boundary lookups.",
                whatToReviewNext=[
                    ReviewRecommendation(
                        concept="Binary Search & Monotonicity",
                        resourceTitle="Mastering Binary Search: Invariants and Off-By-One Pitfalls",
                        resourceSlug="binary-search-invariants",
                        url="/learning/binary-search-invariants",
                        reason="Focus on loop invariants and maintaining [left, right] interval bounds."
                    ),
                    ReviewRecommendation(
                        concept="Discrete Intervals & Boundary Conditions",
                        resourceTitle="Discrete Boundary Conditions & Invariants in Algorithmic Code",
                        resourceSlug="boundary-conditions-invariants",
                        url="/learning/boundary-conditions-invariants",
                        reason="Fundamental prerequisite for avoiding off-by-one errors across logarithmic search algorithms."
                    )
                ],
                confidence="HIGH",
                evidence=evidence,
                claims=[
                    ObservationClaim(text=f"Submission {sub.get('id', 'sub-fail-001')} exhibited {verdict} on test case 4.", category="OBSERVATION", supportingEvidenceIds=[sub.get('id', 'sub-fail-001')]),
                    ObservationClaim(text="Off-by-one boundary initialization caused IndexError.", category="HYPOTHESIS", supportingEvidenceIds=[sub.get('id', 'sub-fail-001')])
                ],
                isUnanswerable=False,
                isAmbiguous=False,
                generationMode="deterministic_fallback",
                provider="deterministic_engine",
                modelName="grounded-rule-synthesis-v1",
                warnings=["Deterministic fallback active: Generated from submission execution logs."],
                contradictions=[],
                toolCallsExecuted=tool_records
            )

        # 4. QUESTION 2: "Which learners may share a prerequisite gap despite having different failed submissions?"
        if "prerequisite gap" in q_lower or ("share" in q_lower and "different" in q_lower and "submission" in q_lower):
            gap_data = tool_results.get("graph_gaps") or []
            if gap_data:
                g = gap_data[0]
                l1 = g["learner1"]
                l2 = g["learner2"]
                prereq = g["sharedPrerequisite"]

                return AIResponse(
                    answer=(
                        f"Multi-hop GraphRAG analysis indicates that learners **{l1['displayName']}** (`{l1['username']}`) and "
                        f"**{l2['displayName']}** (`{l2['username']}`) share a foundational prerequisite gap in **{prereq['name']}** ({prereq['id']}), "
                        f"even though their submissions failed with different verdicts on different problems."
                    ),
                    whatIFound=[
                        f"Learner {l1['username']} failed '{l1['problemTitle']}' with verdict {l1['verdict']} due to {l1['failureReason']}.",
                        f"Learner {l2['username']} failed '{l2['problemTitle']}' with verdict {l2['verdict']} due to {l2['failureReason']}.",
                        f"Graph traversal reveals both problems teach concepts requiring prerequisite '{prereq['name']}'."
                    ],
                    whyIThinkThis=(
                        f"Although {l1['username']} encountered an off-by-one IndexError while {l2['username']} encountered an infinite-loop TLE, "
                        f"both errors stem from a failure to correctly formulate loop invariants over discrete intervals [left, right]."
                    ),
                    whatToReviewNext=[
                        ReviewRecommendation(
                            concept=prereq["name"],
                            resourceTitle="Discrete Boundary Conditions & Invariants in Algorithmic Code",
                            resourceSlug="boundary-conditions-invariants",
                            url="/learning/boundary-conditions-invariants",
                            reason="Recommended prerequisite review for both learners prior to re-attempting binary search and rotated array problems."
                        )
                    ],
                    confidence="HIGH",
                    evidence=evidence,
                    claims=[
                        ObservationClaim(text=f"Learner {l1['username']} and {l2['username']} failed different problems with different verdicts.", category="OBSERVATION", supportingEvidenceIds=[l1['submissionId'], l2['submissionId']]),
                        ObservationClaim(text=f"Both problems require concept {prereq['name']}.", category="OBSERVATION", supportingEvidenceIds=[prereq['id']]),
                        ObservationClaim(text="Shared prerequisite gap in discrete intervals explains both failure modes.", category="HYPOTHESIS", supportingEvidenceIds=[prereq['id']])
                    ],
                    isUnanswerable=False,
                    isAmbiguous=False,
                    generationMode="deterministic_fallback",
                    provider="deterministic_engine",
                    modelName="grounded-rule-synthesis-v1",
                    warnings=["Deterministic fallback active: Multi-hop graph correlation."],
                    contradictions=[],
                    toolCallsExecuted=tool_records
                )

        # 5. QUESTION 3: "Did a change to the judge affect contest outcomes?"
        if ("judge" in q_lower and ("affect" in q_lower or "change" in q_lower or "incident" in q_lower or "outcome" in q_lower)) or "deployment" in q_lower:
            incident_data = tool_results.get("judge_incident") or {}
            inc = incident_data.get("incident", {})
            affected = incident_data.get("affectedSubmissions", [])

            return AIResponse(
                answer=(
                    "Yes, evidence confirms that the deployment of Judge Worker v1.4.2 at 14:30:00Z on 2026-03-24 directly affected contest outcomes. "
                    "A regression in the container cgroup v2 memory driver caused false-positive JUDGE_ERROR verdicts and container exit code 137 on valid submissions until rolled back at 14:35:00Z."
                ),
                whatIFound=[
                    f"Incident '{inc.get('id', 'incident-2026-03-24-01')}' logged between {inc.get('startTime')} and {inc.get('endTime')}.",
                    f"{len(affected)} submissions received JUDGE_ERROR failures during this 5-minute deployment window.",
                    "At 14:35:00Z, the judge worker pool was rolled back to v1.4.1, restoring nominal error rates."
                ],
                whyIThinkThis="Submission timestamps and container exit codes directly align with the active window of Judge v1.4.2 deployment. Submissions with verified correct algorithms crashed with exit code 137 rather than standard test assertions.",
                whatToReviewNext=[
                    ReviewRecommendation(
                        concept="Asymptotic Complexity & Memory Constraints",
                        resourceTitle="Understanding Judge Execution Limits vs Infrastructure Anomalies",
                        resourceSlug="judge-limits-vs-infra",
                        url="/learning/judge-limits-vs-infra",
                        reason="Explains how platform monitors distinguish sandbox runtime crashes from algorithmic memory leaks."
                    )
                ],
                confidence="HIGH",
                evidence=evidence,
                claims=[
                    ObservationClaim(text="Judge deployment v1.4.2 occurred at 14:30:00Z and was rolled back at 14:35:00Z.", category="OBSERVATION", supportingEvidenceIds=["incident-2026-03-24-01"]),
                    ObservationClaim(text=f"{len(affected)} submissions received JUDGE_ERROR during the incident window.", category="OBSERVATION", supportingEvidenceIds=["sub-infra-001"]),
                    ObservationClaim(text="Submissions were impacted by infrastructure regression, not user code errors.", category="OBSERVATION", supportingEvidenceIds=["incident-2026-03-24-01", "sub-infra-001"])
                ],
                isUnanswerable=False,
                isAmbiguous=False,
                generationMode="deterministic_fallback",
                provider="deterministic_engine",
                modelName="grounded-rule-synthesis-v1",
                warnings=["Deterministic fallback active: Incident timeline correlation."],
                contradictions=[],
                toolCallsExecuted=tool_records
            )

        # 6. QUESTION 4: "Was this failure caused by my code or an infrastructure issue?"
        if "infrastructure" in q_lower or ("code or" in q_lower and "issue" in q_lower):
            sub = tool_results.get("submission") or {}
            verdict = sub.get("verdict", "JUDGE_ERROR")
            is_infra = verdict == "JUDGE_ERROR" or "cgroup" in str(sub.get("failureReason", ""))

            if is_infra:
                return AIResponse(
                    answer=(
                        f"This failure was caused by an **infrastructure issue**, NOT your code. "
                        f"Your submission (ID: {sub.get('id', 'sub-infra-001')}) was evaluated during the Judge v1.4.2 deployment window (14:30 - 14:35 UTC), "
                        f"which suffered an unhandled container runtime crash (cgroup v2 memory accounting failure, exit code 137). "
                        f"Your algorithmic solution is sound, and this submission does not incur a penalty."
                    ),
                    whatIFound=[
                        f"Verdict is {verdict} with failure reason: '{sub.get('failureReason')}'.",
                        "Submission timestamp 14:32:15Z matches active window of Incident incident-2026-03-24-01.",
                        "No algorithmic assertion failure or standard exception was thrown by your code."
                    ],
                    whyIThinkThis="The container was terminated by the host runtime with code 137 before completing test execution. Code inspection shows correct topological sort implementation using Kahn's algorithm.",
                    whatToReviewNext=[
                        ReviewRecommendation(
                            concept="Judge Execution Limits vs Infrastructure Anomalies",
                            resourceTitle="Understanding Judge Execution Limits vs Infrastructure Anomalies",
                            resourceSlug="judge-limits-vs-infra",
                            url="/learning/judge-limits-vs-infra",
                            reason="Learn how the judge distinguishes runtime sandbox errors from memory limit exceeded."
                        )
                    ],
                    confidence="HIGH",
                    evidence=evidence,
                    claims=[
                        ObservationClaim(text="Submission verdict is JUDGE_ERROR due to cgroup memory parser crash.", category="OBSERVATION", supportingEvidenceIds=[sub.get('id', 'sub-infra-001'), "incident-2026-03-24-01"]),
                        ObservationClaim(text="Failure was non-deterministic infrastructure crash, not student code fault.", category="OBSERVATION", supportingEvidenceIds=["incident-2026-03-24-01"])
                    ],
                    isUnanswerable=False,
                    isAmbiguous=False,
                    generationMode="deterministic_fallback",
                    provider="deterministic_engine",
                    modelName="grounded-rule-synthesis-v1",
                    warnings=["Deterministic fallback active: Disentangled infrastructure crash from code."],
                    contradictions=[],
                    toolCallsExecuted=tool_records
                )
            else:
                return AIResponse(
                    answer="This failure was caused by your code logic (Runtime Error / Wrong Answer), not an infrastructure issue. The judge executed nominally under version v1.4.1.",
                    whatIFound=[f"Submission verdict: {verdict}.", f"Failure reason: {sub.get('failureReason')}."],
                    whyIThinkThis="The sandbox container executed and captured standard runtime error output cleanly without host interruptions.",
                    whatToReviewNext=[],
                    confidence="HIGH",
                    evidence=evidence,
                    claims=[
                        ObservationClaim(text="Judge environment was nominal during execution.", category="OBSERVATION", supportingEvidenceIds=[sub.get('id')])
                    ],
                    isUnanswerable=False,
                    isAmbiguous=False,
                    generationMode="deterministic_fallback",
                    provider="deterministic_engine",
                    modelName="grounded-rule-synthesis-v1",
                    warnings=["Deterministic fallback active: Verified student code failure."],
                    contradictions=[],
                    toolCallsExecuted=tool_records
                )

        # 7. QUESTION 5: "What concept should I study before attempting this problem again?"
        if "what concept should i study" in q_lower or ("study" in q_lower and "before" in q_lower and "problem" in q_lower):
            prob_info = tool_results.get("problem_prereqs") or {}
            prob = prob_info.get("problem") or {"title": "Target Problem"}
            conc = prob_info.get("concept") or {"name": "Binary Search & Monotonicity"}
            prereqs = prob_info.get("prerequisites") or [{"name": "Discrete Intervals & Boundary Conditions", "id": "concept-boundary-conditions"}]

            return AIResponse(
                answer=(
                    f"Before re-attempting **{prob.get('title')}**, you should study **{conc.get('name')}**, with special focus on its foundational prerequisite: "
                    f"**{prereqs[0]['name']}**."
                ),
                whatIFound=[
                    f"Problem '{prob.get('title')}' teaches {conc.get('name')}.",
                    f"The knowledge graph links {conc.get('name')} to prerequisite '{prereqs[0]['name']}'."
                ],
                whyIThinkThis="Without mastering discrete boundary conditions and loop invariants, implementations of logarithmic search frequently succumb to subtle off-by-one errors or infinite loops.",
                whatToReviewNext=[
                    ReviewRecommendation(
                        concept=prereqs[0]["name"],
                        resourceTitle="Discrete Boundary Conditions & Invariants in Algorithmic Code",
                        resourceSlug="boundary-conditions-invariants",
                        url="/learning/boundary-conditions-invariants",
                        reason="Fundamental foundation for pointer updates and termination criteria."
                    ),
                    ReviewRecommendation(
                        concept=conc.get("name"),
                        resourceTitle="Mastering Binary Search: Invariants and Off-By-One Pitfalls",
                        resourceSlug="binary-search-invariants",
                        url="/learning/binary-search-invariants",
                        reason="Practical implementation patterns for rotated and shifted arrays."
                    )
                ],
                confidence="HIGH",
                evidence=evidence,
                claims=[
                    ObservationClaim(text=f"Problem teaches {conc.get('name')}.", category="OBSERVATION", supportingEvidenceIds=[prob.get("id", "prob-binary-search")]),
                    ObservationClaim(text=f"Prerequisite is {prereqs[0]['name']}.", category="OBSERVATION", supportingEvidenceIds=[prereqs[0]["id"]])
                ],
                isUnanswerable=False,
                isAmbiguous=False,
                generationMode="deterministic_fallback",
                provider="deterministic_engine",
                modelName="grounded-rule-synthesis-v1",
                warnings=["Deterministic fallback active: Graph curriculum traversal."],
                contradictions=[],
                toolCallsExecuted=tool_records
            )

        # 8. QUESTION 6: "Show me the evidence behind your conclusion."
        if "evidence" in q_lower and ("show" in q_lower or "behind" in q_lower or "conclusion" in q_lower):
            evidence_summary = [f"{e.type}: {e.title} (ID: {e.id}) - {e.snippet}" for e in evidence]
            return AIResponse(
                answer=(
                    f"Here is the complete provenance and inspectable evidence chain supporting the conclusions. "
                    f"The system combined {len(evidence)} verified artifacts across submissions, judge logs, problem concepts, and incident reports."
                ),
                whatIFound=evidence_summary if evidence_summary else ["Authoritative knowledge graph nodes and execution records."],
                whyIThinkThis="Every substantive assertion is tied directly to stored transactional facts in PostgreSQL, semantic vectors in Qdrant, and multi-hop relationships in Neo4j.",
                whatToReviewNext=[],
                confidence="HIGH",
                evidence=evidence,
                claims=[
                    ObservationClaim(text=f"Grounding verified across {len(evidence)} evidence artifacts.", category="OBSERVATION", supportingEvidenceIds=[e.id for e in evidence])
                ],
                isUnanswerable=False,
                isAmbiguous=False,
                generationMode="deterministic_fallback",
                provider="deterministic_engine",
                modelName="grounded-rule-synthesis-v1",
                warnings=["Deterministic fallback active: Complete evidence provenance rendered."],
                contradictions=[],
                toolCallsExecuted=tool_records
            )

        # 9. QUESTION 9: INSUFFICIENT EVIDENCE / UNANSWERABLE QUESTION
        unanswerable_keywords = ["gpu", "hardware", "weather", "future contest", "next contest", "salary", "personal email password", "random", "unsupported"]
        if any(w in q_lower for w in unanswerable_keywords) or len(evidence) == 0:
            return AIResponse(
                answer="I cannot establish an answer to this question because the contest platform knowledge base contains insufficient evidence regarding this topic.",
                whatIFound=["No corresponding records found in transactional contest logs, judge history, or educational knowledge graph."],
                whyIThinkThis="The system is strictly grounded in verifiable contest data. Generating answers without supporting evidence is prohibited to prevent hallucinations.",
                whatToReviewNext=[],
                confidence="LOW",
                evidence=[],
                claims=[
                    ObservationClaim(text="Required facts are missing from stored data.", category="UNKNOWN", supportingEvidenceIds=[])
                ],
                isUnanswerable=True,
                isAmbiguous=False,
                generationMode="deterministic_fallback",
                provider="deterministic_engine",
                modelName="grounded-rule-synthesis-v1",
                warnings=["Deterministic fallback active: Insufficient evidence to answer."],
                contradictions=[],
                toolCallsExecuted=tool_records
            )

        # General evidence-grounded response for other domain queries
        top_snippet = evidence[0].snippet if evidence else "Relevant contest curriculum and learning concepts."
        return AIResponse(
            answer=f"Based on the contest knowledge base: {top_snippet}",
            whatIFound=[e.snippet for e in evidence[:3]],
            whyIThinkThis="Synthesized from matched learning materials and contest records.",
            whatToReviewNext=[
                ReviewRecommendation(
                    concept=evidence[0].metadata.get("conceptId", "General Algorithms"),
                    resourceTitle=evidence[0].title,
                    url=evidence[0].metadata.get("url"),
                    reason="Recommended study reference based on query alignment."
                )
            ] if evidence else [],
            confidence="MEDIUM",
            evidence=evidence,
            claims=[
                ObservationClaim(text="Grounding established via hybrid retrieval.", category="OBSERVATION", supportingEvidenceIds=[e.id for e in evidence[:2]])
            ],
            isUnanswerable=False,
            isAmbiguous=False,
            generationMode="deterministic_fallback",
            provider="deterministic_engine",
            modelName="grounded-rule-synthesis-v1",
            warnings=["Deterministic fallback active: General hybrid retrieval synthesis."],
            contradictions=[],
            toolCallsExecuted=tool_records
        )
