from typing import Dict, Any, List, Optional
from data.seed_knowledge import (
    USERS_SEED,
    SUBMISSIONS_SEED,
    PROBLEMS_KNOWLEDGE,
    CONTEST_INCIDENTS,
    JUDGE_VERSIONS,
    LEARNING_RESOURCES,
    CONCEPTS
)

class SecurityError(Exception):
    pass

class BoundedAgentTools:
    """
    Strictly read-only agentic tools enforcing role-based boundaries,
    learner privacy protections, and hidden test-case redaction.
    """
    def __init__(self, hybrid_retriever, graph_rag, entity_resolver):
        self.retriever = hybrid_retriever
        self.graph_rag = graph_rag
        self.entity_resolver = entity_resolver

    def get_user_profile(self, user_id_or_username: str) -> Dict[str, Any]:
        res = self.entity_resolver.resolve_user(user_id_or_username)
        if res["matched"]:
            # Redact email or sensitive auth fields
            u = res["user"]
            return {
                "id": u["id"],
                "username": u["username"],
                "displayName": u["displayName"],
                "role": u["role"]
            }
        return {"error": "User not found"}

    def get_submission(self, submission_id: str, requesting_user_id: str, requesting_role: str) -> Dict[str, Any]:
        """
        SECURITY BOUNDARY:
        Learner A cannot view Learner B's submission source code.
        """
        sub = next((s for s in SUBMISSIONS_SEED if s["id"] == submission_id), None)
        if not sub:
            return {"error": f"Submission {submission_id} not found"}

        if requesting_role == "learner" and sub["userId"] != requesting_user_id:
            raise SecurityError(
                f"403 Forbidden: Learner '{requesting_user_id}' is not authorized to access private submission '{submission_id}' belonging to another learner."
            )

        return {
            "id": sub["id"],
            "userId": sub["userId"],
            "username": sub["username"],
            "problemId": sub["problemId"],
            "verdict": sub["verdict"],
            "status": sub["status"],
            "executionTimeMs": sub["executionTimeMs"],
            "memoryUsageKb": sub["memoryUsageKb"],
            "score": sub["score"],
            "judgeVersion": sub["judgeVersion"],
            "failureReason": sub.get("failureReason"),
            "createdAt": sub["createdAt"],
            "sourceCode": sub["sourceCode"] # only accessible if authorized
        }

    def get_submission_history(self, target_user_id: str, requesting_user_id: str, requesting_role: str) -> List[Dict[str, Any]]:
        """
        SECURITY BOUNDARY:
        Learner can only view their own submission history.
        """
        if requesting_role == "learner" and target_user_id != requesting_user_id:
            raise SecurityError(
                f"403 Forbidden: Cannot view another learner's private submission history."
            )

        user_subs = [s for s in SUBMISSIONS_SEED if s["userId"] == target_user_id]
        return [
            {
                "id": s["id"],
                "problemId": s["problemId"],
                "verdict": s["verdict"],
                "score": s["score"],
                "createdAt": s["createdAt"],
                "failureReason": s.get("failureReason")
            }
            for s in user_subs
        ]

    def get_problem(self, problem_id: str, requesting_role: str = "learner") -> Dict[str, Any]:
        """
        SECURITY BOUNDARY:
        Hidden test cases are NEVER exposed.
        """
        p = next((pk for pk in PROBLEMS_KNOWLEDGE if pk["id"] == problem_id), None)
        if not p:
            return {"error": f"Problem {problem_id} not found"}

        return {
            "id": p["id"],
            "title": p["title"],
            "difficulty": p["difficulty"],
            "conceptId": p["conceptId"],
            "explanation": p["explanation"],
            # Sample test case only
            "sampleTests": [
                {"input": "nums = [2,7,11,15], target = 9", "expectedOutput": "[0,1]"}
            ]
        }

    def get_test_results(self, submission_id: str, requesting_user_id: str, requesting_role: str) -> Dict[str, Any]:
        """
        SECURITY BOUNDARY:
        Does not leak hidden test inputs or expected outputs to learners.
        """
        sub = self.get_submission(submission_id, requesting_user_id, requesting_role)
        if "error" in sub:
            return sub

        return {
            "submissionId": sub["id"],
            "verdict": sub["verdict"],
            "failureReason": sub.get("failureReason"),
            "hiddenTestsProtected": True
        }

    def get_contest(self, contest_id: str) -> Dict[str, Any]:
        return {
            "id": contest_id,
            "title": "Spring 2026 Algorithmic Championship",
            "status": "ACTIVE",
            "organization": "Shodh Academy",
            "problemsCount": len(PROBLEMS_KNOWLEDGE)
        }

    def get_leaderboard(self, contest_id: str) -> List[Dict[str, Any]]:
        return [
            {"rank": 1, "username": "aarav_patel", "score": 100, "solved": 1},
            {"rank": 2, "username": "priya_sharma", "score": 0, "solved": 0},
            {"rank": 3, "username": "ronak", "score": 0, "solved": 0}
        ]

    def get_judge_history(self, contest_id: str = None) -> List[Dict[str, Any]]:
        return JUDGE_VERSIONS

    def get_judge_incidents(self, contest_id: str = None) -> List[Dict[str, Any]]:
        return CONTEST_INCIDENTS

    def search_learning_material(self, query: str) -> List[Dict[str, Any]]:
        hits = self.retriever.retrieve(query, top_k=3)
        return [
            {
                "id": h.id,
                "title": h.title,
                "snippet": h.snippet,
                "url": h.metadata.get("url")
            }
            for h in hits
        ]

    def resolve_entity(self, query: str) -> Dict[str, Any]:
        return self.entity_resolver.resolve_user(query)

    def query_graph(self, action: str, params: Dict[str, Any] = None) -> Any:
        params = params or {}
        if action == "shared_prerequisite_gaps":
            return self.graph_rag.find_shared_prerequisite_gaps()
        elif action == "judge_incident":
            return self.graph_rag.investigate_judge_incident(params.get("contestId", "contest-spring-2026"))
        elif action == "problem_prerequisites":
            return self.graph_rag.get_prerequisites_for_problem(params.get("problemId", "prob-binary-search"))
        return {"error": f"Unknown graph query action: {action}"}
