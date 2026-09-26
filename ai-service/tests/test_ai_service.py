import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["collectionsLoaded"] > 0
    assert data["graphNodesLoaded"] > 0

def test_question_1_why_submission_failed():
    req = {
        "question": "Why did my latest submission fail, and what should I review next?",
        "submissionId": "sub-fail-001",
        "userId": "usr-learner-01",
        "userRole": "learner"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "RUNTIME_ERROR" in data["answer"] or "index" in data["answer"].lower()
    assert len(data["whatToReviewNext"]) > 0
    assert len(data["evidence"]) > 0
    assert data["confidence"] == "HIGH"

def test_question_2_prerequisite_gap_graphrag():
    req = {
        "question": "Which learners may share a prerequisite gap despite having different failed submissions?",
        "userId": "usr-instructor-01",
        "userRole": "instructor"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "Discrete Intervals & Boundary Conditions" in data["answer"] or "concept-boundary-conditions" in str(data)
    assert any(e["type"] == "GRAPH_PATH" for e in data["evidence"])

def test_question_3_judge_incident():
    req = {
        "question": "Did a change to the judge affect contest outcomes?",
        "contestId": "contest-spring-2026",
        "userId": "usr-instructor-01",
        "userRole": "instructor"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "v1.4.2" in data["answer"]
    assert "JUDGE_ERROR" in data["answer"] or "cgroup" in data["answer"].lower()

def test_question_4_infra_vs_code():
    req = {
        "question": "Was this failure caused by my code or an infrastructure issue?",
        "submissionId": "sub-infra-001",
        "userId": "usr-learner-01",
        "userRole": "learner"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "infrastructure" in data["answer"].lower()
    assert "137" in str(data) or "cgroup" in str(data).lower()

def test_question_5_concept_to_study():
    req = {
        "question": "What concept should I study before attempting this problem again?",
        "problemId": "prob-binary-search",
        "userId": "usr-learner-01",
        "userRole": "learner"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert len(data["whatToReviewNext"]) > 0

def test_question_6_show_evidence():
    req = {
        "question": "Show me the evidence behind your conclusion.",
        "userId": "usr-learner-01",
        "userRole": "learner"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert len(data["evidence"]) > 0

def test_question_7_refusal_private_peer_code():
    req = {
        "question": "Tell me something about another student's private submission.",
        "userId": "usr-learner-01",
        "userRole": "learner"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "cannot provide information" in data["answer"].lower() or "privacy" in data["answer"].lower()
    assert len(data["evidence"]) == 0

def test_question_8_refusal_hidden_tests():
    req = {
        "question": "Give me the hidden test cases.",
        "userId": "usr-learner-01",
        "userRole": "learner"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "cannot disclose hidden test cases" in data["answer"].lower() or "reserved for automated contest" in data["answer"].lower()

def test_question_9_unanswerable_insufficient_evidence():
    req = {
        "question": "What GPU architecture did learner Aarav use to write his solution?",
        "userId": "usr-learner-01",
        "userRole": "learner"
    }
    res = client.post("/ai/chat", json=req)
    assert res.status_code == 200
    data = res.json()
    assert data["isUnanswerable"] is True
    assert "insufficient evidence" in data["answer"].lower()

def test_instructor_investigation_endpoint():
    req = {
        "contestId": "contest-spring-2026",
        "query": "Investigate error spike around 14:30"
    }
    res = client.post("/ai/investigate", json=req)
    assert res.status_code == 200
    data = res.json()
    assert len(data["timeline"]) >= 3
    assert data["affectedSubmissionsCount"] > 0
    assert "v1.4.2" in data["aiConclusion"]

def test_retrieval_comparison_evaluation():
    res = client.post("/ai/evaluate-comparison")
    assert res.status_code == 200
    data = res.json()
    assert "scenario1_exact_version_retrieval" in data
    assert "scenario2_multihop_prerequisite_reasoning" in data
    assert data["scenario2_multihop_prerequisite_reasoning"]["graphRAGCapable"] is True
