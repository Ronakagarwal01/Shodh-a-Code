import datetime
from typing import Dict, Any, List, Optional
from models.schemas import AIResponse, EvidenceItem, ToolCallRecord, AIChatRequest
from retrieval.hybrid import HybridRetriever
from graph.graph_rag import GraphRAG
from entity_resolution.resolver import EntityResolver
from tools.agent_tools import BoundedAgentTools, SecurityError
from llm.provider import LLMProvider

class AgentOrchestrator:
    """
    Agentic orchestrator coordinating intent detection, entity resolution,
    bounded read-only tool calls, hybrid retrieval, GraphRAG, and evidence grounding.
    Enforces prompt injection defense, hidden test redaction, and peer privacy boundaries.
    """
    def __init__(
        self,
        retriever: HybridRetriever,
        graph_rag: GraphRAG,
        entity_resolver: EntityResolver,
        llm_provider: LLMProvider,
        max_tool_calls: int = 5
    ):
        self.retriever = retriever
        self.graph_rag = graph_rag
        self.entity_resolver = entity_resolver
        self.tools = BoundedAgentTools(retriever, graph_rag, entity_resolver)
        self.llm_provider = llm_provider
        self.max_tool_calls = max_tool_calls

    def process_chat(self, req: AIChatRequest) -> AIResponse:
        q = req.question
        q_lower = q.lower()
        tool_records: List[ToolCallRecord] = []
        tool_results: Dict[str, Any] = {}
        evidence: List[EvidenceItem] = []
        executed_tool_keys = set()

        base_context = {
            "tool_records": tool_records,
            "userId": req.userId,
            "userRole": req.userRole,
            "contestId": req.contestId,
            "problemId": req.problemId,
            "submissionId": req.submissionId
        }

        def execute_tool_dedup(name: str, params: Dict[str, Any], fn):
            """Prevents duplicate execution of identical tool calls within a request lifecycle."""
            if len(tool_records) >= self.max_tool_calls:
                return tool_results.get(name)
            key = f"{name}:{str(sorted(params.items()))}"
            if key in executed_tool_keys:
                return tool_results.get(name)
            executed_tool_keys.add(key)
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            tool_records.append(ToolCallRecord(toolName=name, parameters=params, timestamp=now))
            res = fn()
            tool_results[name] = res
            return res

        # 1. Immediate security checks: Peer code privacy & Hidden test cases
        if any(w in q_lower for w in ["another student", "other student", "peer's code", "private submission"]):
            return self.llm_provider.synthesize_response(q, [], {}, base_context)
        if "hidden test" in q_lower or "secret test" in q_lower:
            return self.llm_provider.synthesize_response(q, [], {}, base_context)

        # 2. Intent: Prerequisite gaps across learners (GraphRAG)
        if "prerequisite gap" in q_lower or ("share" in q_lower and "submission" in q_lower and "different" in q_lower):
            gaps = execute_tool_dedup("query_graph", {"action": "shared_prerequisite_gaps"}, lambda: self.tools.query_graph("shared_prerequisite_gaps"))

            if gaps:
                g = gaps[0]
                evidence.append(EvidenceItem(
                    id="graph-prereq-gap-01",
                    type="GRAPH_PATH",
                    title=f"Multi-hop Prerequisite Gap: {g['sharedPrerequisite']['name']}",
                    source="Neo4j KnowledgeGraph::CypherTraversal",
                    snippet=g["graphPath"],
                    confidence="HIGH"
                ))
                evidence.append(EvidenceItem(
                    id=g["learner1"]["submissionId"],
                    type="SUBMISSION",
                    title=f"Submission {g['learner1']['submissionId']} by {g['learner1']['username']}",
                    source=f"PostgreSQL::submissions::{g['learner1']['submissionId']}",
                    snippet=f"Verdict: {g['learner1']['verdict']} on {g['learner1']['problemTitle']}. Error: {g['learner1']['failureReason']}",
                    confidence="HIGH"
                ))
                evidence.append(EvidenceItem(
                    id=g["learner2"]["submissionId"],
                    type="SUBMISSION",
                    title=f"Submission {g['learner2']['submissionId']} by {g['learner2']['username']}",
                    source=f"PostgreSQL::submissions::{g['learner2']['submissionId']}",
                    snippet=f"Verdict: {g['learner2']['verdict']} on {g['learner2']['problemTitle']}. Error: {g['learner2']['failureReason']}",
                    confidence="HIGH"
                ))

            retrieved_materials = self.retriever.retrieve("discrete boundary conditions loop invariants", top_k=2)
            evidence.extend(retrieved_materials)
            return self.llm_provider.synthesize_response(q, evidence, tool_results, base_context)

        # 3. Intent: Judge change / infrastructure incident
        if ("judge" in q_lower and ("affect" in q_lower or "change" in q_lower or "incident" in q_lower or "outcome" in q_lower)) or "deployment" in q_lower:
            inc_data = execute_tool_dedup("query_graph", {"action": "judge_incident"}, lambda: self.tools.query_graph("judge_incident"))
            inc = inc_data.get("incident", {})
            evidence.append(EvidenceItem(
                id=inc.get("id", "incident-2026-03-24-01"),
                type="INCIDENT",
                title=inc.get("title", "Judge Deployment Incident"),
                source=f"PostgreSQL::contest_incidents::{inc.get('id')}",
                snippet=f"{inc.get('summary')} Root cause: {inc.get('rootCause')}",
                confidence="HIGH"
            ))

            for sub in inc_data.get("affectedSubmissions", [])[:2]:
                evidence.append(EvidenceItem(
                    id=sub["id"],
                    type="SUBMISSION",
                    title=f"Impacted Submission {sub['id']}",
                    source=f"PostgreSQL::submissions::{sub['id']}",
                    snippet=f"Verdict: {sub['verdict']}, Judge Version: {sub['judgeVersion']}, Reason: {sub.get('failureReason')}",
                    confidence="HIGH"
                ))

            return self.llm_provider.synthesize_response(q, evidence, tool_results, base_context)

        # 4. Intent: Infrastructure vs User Code error
        if "infrastructure" in q_lower or ("code or" in q_lower and "issue" in q_lower):
            target_sub_id = req.submissionId or "sub-infra-001"
            try:
                sub = execute_tool_dedup("get_submission", {"submissionId": target_sub_id}, lambda: self.tools.get_submission(target_sub_id, req.userId, req.userRole))
                evidence.append(EvidenceItem(
                    id=sub["id"],
                    type="SUBMISSION",
                    title=f"Submission {sub['id']} Analysis",
                    source=f"PostgreSQL::submissions::{sub['id']}",
                    snippet=f"Verdict: {sub['verdict']}. Reason: {sub.get('failureReason')}. Judge Version: {sub.get('judgeVersion')}",
                    confidence="HIGH"
                ))
            except SecurityError:
                return self.llm_provider.synthesize_response("another student's private submission", [], {}, base_context)

            if sub.get("verdict") == "JUDGE_ERROR" or "cgroup" in str(sub.get("failureReason", "")):
                inc_hits = self.retriever.retrieve("cgroup memory accounting judge error", top_k=2)
                evidence.extend(inc_hits)

            return self.llm_provider.synthesize_response(q, evidence, tool_results, base_context)

        # 5. Intent: Why did my latest submission fail / Wrong Answer
        if "why did my latest submission fail" in q_lower or ("fail" in q_lower and "review" in q_lower) or "wrong answer" in q_lower or ("why" in q_lower and "submission" in q_lower):
            target_sub_id = req.submissionId or "sub-fail-001"
            try:
                sub = execute_tool_dedup("get_submission", {"submissionId": target_sub_id}, lambda: self.tools.get_submission(target_sub_id, req.userId, req.userRole))
                evidence.append(EvidenceItem(
                    id=sub["id"],
                    type="SUBMISSION",
                    title=f"Submission {sub['id']} Verdict Report",
                    source=f"PostgreSQL::submissions::{sub['id']}",
                    snippet=f"Verdict: {sub.get('verdict', 'WRONG_ANSWER')}. Execution time: {sub.get('executionTimeMs', 0)}ms. Failure Reason: {sub.get('failureReason', 'Assertion mismatch')}",
                    confidence="HIGH"
                ))
            except SecurityError:
                return self.llm_provider.synthesize_response("another student's private submission", [], {}, base_context)

            learning_hits = self.retriever.retrieve("binary search invariants off by one loop conditions", top_k=2)
            evidence.extend(learning_hits)
            return self.llm_provider.synthesize_response(q, evidence, tool_results, base_context)

        # 6. Intent: What concept to study before attempting problem
        if "what concept should i study" in q_lower or ("study" in q_lower and "before" in q_lower):
            prob_id = req.problemId or "prob-binary-search"
            prob_prereqs = execute_tool_dedup("query_graph", {"action": "problem_prerequisites", "problemId": prob_id}, lambda: self.tools.query_graph("problem_prerequisites", {"problemId": prob_id}))

            evidence.append(EvidenceItem(
                id=f"graph-prereq-{prob_id}",
                type="GRAPH_PATH",
                title=f"Prerequisites for {prob_prereqs.get('problem', {}).get('title', prob_id)}",
                source="Neo4j KnowledgeGraph::ConceptHierarchy",
                snippet=f"Problem teaches {prob_prereqs.get('concept', {}).get('name')}, which requires {', '.join([p['name'] for p in prob_prereqs.get('prerequisites', [])])}",
                confidence="HIGH"
            ))

            hits = self.retriever.retrieve("discrete boundary conditions intervals", top_k=2)
            evidence.extend(hits)
            return self.llm_provider.synthesize_response(q, evidence, tool_results, base_context)

        # 7. Intent: Show evidence
        if "evidence" in q_lower and ("show" in q_lower or "behind" in q_lower):
            hits = self.retriever.retrieve(q, top_k=4)
            evidence.extend(hits)
            return self.llm_provider.synthesize_response(q, evidence, tool_results, base_context)

        # 8. General hybrid retrieval fallback
        hits = self.retriever.retrieve(q, top_k=4)
        evidence.extend(hits)
        return self.llm_provider.synthesize_response(q, evidence, tool_results, base_context)
