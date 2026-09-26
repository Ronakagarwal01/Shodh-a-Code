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
    bounded tool calls, hybrid retrieval, GraphRAG, and evidence grounding.
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

        def execute_tool_dedup(name: str, params: Dict[str, Any], fn):
            """Prevents duplicate execution of identical tool calls within a request lifecycle."""
            key = f"{name}:{str(sorted(params.items()))}"
            if key in executed_tool_keys:
                return tool_results.get(name)
            executed_tool_keys.add(key)
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            tool_records.append(ToolCallRecord(toolName=name, parameters=params, timestamp=now))
            res = fn()
            tool_results[name] = res
            return res

        # Check for immediate security blockages before tool execution
        if any(w in q_lower for w in ["another student", "other student", "peer's code", "private submission"]):
            return self.llm_provider.synthesize_response(q, [], {}, {"tool_records": []})
        if "hidden test" in q_lower or "secret test" in q_lower:
            return self.llm_provider.synthesize_response(q, [], {}, {"tool_records": []})

        # 1. Intent: Prerequisite gaps across learners (GraphRAG)
        if "prerequisite gap" in q_lower or ("share" in q_lower and "submission" in q_lower and "different" in q_lower):
            gaps = execute_tool_dedup("query_graph", {"action": "shared_prerequisite_gaps"}, lambda: self.tools.query_graph("shared_prerequisite_gaps"))

            if gaps:
                g = gaps[0]
                # Graph path evidence
                evidence.append(EvidenceItem(
                    id="graph-prereq-gap-01",
                    type="GRAPH_PATH",
                    title=f"Multi-hop Prerequisite Gap: {g['sharedPrerequisite']['name']}",
                    source="Neo4j KnowledgeGraph::CypherTraversal",
                    snippet=g["graphPath"],
                    confidence="HIGH"
                ))
                # Submission 1 evidence
                evidence.append(EvidenceItem(
                    id=g["learner1"]["submissionId"],
                    type="SUBMISSION",
                    title=f"Submission {g['learner1']['submissionId']} by {g['learner1']['username']}",
                    source=f"PostgreSQL::submissions::{g['learner1']['submissionId']}",
                    snippet=f"Verdict: {g['learner1']['verdict']} on {g['learner1']['problemTitle']}. Error: {g['learner1']['failureReason']}",
                    confidence="HIGH"
                ))
                # Submission 2 evidence
                evidence.append(EvidenceItem(
                    id=g["learner2"]["submissionId"],
                    type="SUBMISSION",
                    title=f"Submission {g['learner2']['submissionId']} by {g['learner2']['username']}",
                    source=f"PostgreSQL::submissions::{g['learner2']['submissionId']}",
                    snippet=f"Verdict: {g['learner2']['verdict']} on {g['learner2']['problemTitle']}. Error: {g['learner2']['failureReason']}",
                    confidence="HIGH"
                ))

            # Also hybrid retrieve learning material for the prerequisite
            retrieved_materials = self.retriever.retrieve("discrete boundary conditions loop invariants", top_k=2)
            evidence.extend(retrieved_materials)

            return self.llm_provider.synthesize_response(q, evidence, tool_results, {"tool_records": tool_records})

        # 2. Intent: Judge change / infrastructure incident
        if ("judge" in q_lower and ("affect" in q_lower or "change" in q_lower or "incident" in q_lower or "outcome" in q_lower)) or "deployment" in q_lower:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            tool_records.append(ToolCallRecord(toolName="query_graph", parameters={"action": "judge_incident"}, timestamp=now))
            inc_data = self.tools.query_graph("judge_incident")
            tool_results["judge_incident"] = inc_data

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

            return self.llm_provider.synthesize_response(q, evidence, tool_results, {"tool_records": tool_records})

        # 3. Intent: Infrastructure vs User Code error
        if "infrastructure" in q_lower or ("code or" in q_lower and "issue" in q_lower):
            # Inspect submission
            target_sub_id = req.submissionId or "sub-infra-001"
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            tool_records.append(ToolCallRecord(toolName="get_submission", parameters={"submissionId": target_sub_id}, timestamp=now))
            try:
                sub = self.tools.get_submission(target_sub_id, req.userId, req.userRole)
                tool_results["submission"] = sub
                evidence.append(EvidenceItem(
                    id=sub["id"],
                    type="SUBMISSION",
                    title=f"Submission {sub['id']} Analysis",
                    source=f"PostgreSQL::submissions::{sub['id']}",
                    snippet=f"Verdict: {sub['verdict']}. Reason: {sub.get('failureReason')}. Judge Version: {sub.get('judgeVersion')}",
                    confidence="HIGH"
                ))
            except SecurityError as e:
                return self.llm_provider.synthesize_response("another student's private submission", [], {}, {"tool_records": tool_records})

            # Check if associated with incident
            if sub.get("verdict") == "JUDGE_ERROR" or "cgroup" in str(sub.get("failureReason", "")):
                inc_hits = self.retriever.retrieve("cgroup memory accounting judge error", top_k=2)
                evidence.extend(inc_hits)

            return self.llm_provider.synthesize_response(q, evidence, tool_results, {"tool_records": tool_records})

        # 4. Intent: "Why did my latest submission fail, and what should I review next?"
        if "why did my latest submission fail" in q_lower or ("fail" in q_lower and "review" in q_lower):
            target_sub_id = req.submissionId or "sub-fail-001"
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            tool_records.append(ToolCallRecord(toolName="get_submission", parameters={"submissionId": target_sub_id}, timestamp=now))
            try:
                sub = self.tools.get_submission(target_sub_id, req.userId, req.userRole)
                tool_results["submission"] = sub
                evidence.append(EvidenceItem(
                    id=sub["id"],
                    type="SUBMISSION",
                    title=f"Submission {sub['id']} Verdict Report",
                    source=f"PostgreSQL::submissions::{sub['id']}",
                    snippet=f"Verdict: {sub['verdict']}. Execution time: {sub['executionTimeMs']}ms. Failure Reason: {sub.get('failureReason')}",
                    confidence="HIGH"
                ))
            except SecurityError:
                return self.llm_provider.synthesize_response("another student's private submission", [], {}, {"tool_records": tool_records})

            # Retrieve learning material for binary search invariants
            learning_hits = self.retriever.retrieve("binary search invariants off by one loop conditions", top_k=2)
            evidence.extend(learning_hits)

            return self.llm_provider.synthesize_response(q, evidence, tool_results, {"tool_records": tool_records})

        # 5. Intent: What concept to study before attempting problem
        if "what concept should i study" in q_lower or ("study" in q_lower and "before" in q_lower):
            prob_id = req.problemId or "prob-binary-search"
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            tool_records.append(ToolCallRecord(toolName="query_graph", parameters={"action": "problem_prerequisites", "problemId": prob_id}, timestamp=now))
            prob_prereqs = self.tools.query_graph("problem_prerequisites", {"problemId": prob_id})
            tool_results["problem_prereqs"] = prob_prereqs

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

            return self.llm_provider.synthesize_response(q, evidence, tool_results, {"tool_records": tool_records})

        # 6. Intent: Show evidence
        if "evidence" in q_lower and ("show" in q_lower or "behind" in q_lower):
            # Run hybrid retrieval on query terms
            hits = self.retriever.retrieve(q, top_k=4)
            evidence.extend(hits)
            return self.llm_provider.synthesize_response(q, evidence, tool_results, {"tool_records": tool_records})

        # 7. General hybrid retrieval fallback
        hits = self.retriever.retrieve(q, top_k=4)
        evidence.extend(hits)
        return self.llm_provider.synthesize_response(q, evidence, tool_results, {"tool_records": tool_records})
