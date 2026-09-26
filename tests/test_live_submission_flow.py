import urllib.request
import urllib.parse
import json
import time
import sys

API_URL = "http://127.0.0.1:4000"
AI_URL = "http://127.0.0.1:8000"

def make_req(method, endpoint, data=None, token=None, base_url=API_URL):
    url = f"{base_url}{endpoint}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    body = json.dumps(data).encode("utf-8") if data else None
    try:
        with urllib.request.urlopen(req, data=body, timeout=10) as resp:
            status = resp.status
            resp_body = resp.read().decode("utf-8")
            return status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(resp_body)
        except Exception:
            return e.code, {"error": resp_body}
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 60)
    print("SHODH-A-CODE — LIVE CRITICAL END-TO-END FLOW VERIFICATION")
    print("=" * 60)

    # 1. REGISTER
    username = f"audit_user_{int(time.time())}"
    print(f"\n[Step 1] Registering user: {username}...")
    st, res = make_req("POST", "/auth/register", {
        "username": username,
        "email": f"{username}@shodh.ai",
        "password": "Password123!",
        "displayName": "Audit Test Learner"
    })
    assert st == 201 or st == 200, f"Registration failed: {res}"
    user_token = res["accessToken"]
    user_id = res["user"]["id"]
    print(f"   [PASS] Registered successfully. User ID: {user_id}")

    # 2. LOGIN
    print("\n[Step 2] Testing login...")
    st, res = make_req("POST", "/auth/login", {
        "username": username,
        "password": "Password123!"
    })
    assert st in (200, 201), f"Login failed: {res}"
    assert "accessToken" in res, "Missing accessToken"
    print("   [PASS] Login successful, JWT issued.")

    # 3. LIST CONTESTS & VIEW PROBLEM
    print("\n[Step 3] Fetching contests and problem 'prob-two-sum'...")
    st, contests = make_req("GET", "/contests")
    assert st == 200 and len(contests) > 0, "No contests found"
    print(f"   [PASS] Found {len(contests)} contests.")

    st, prob = make_req("GET", "/problems/prob-two-sum", token=user_token)
    assert st == 200, f"Failed to get problem: {prob}"
    # Verify hidden test protection
    for tc in prob.get("sampleTestCases", []):
        assert not tc.get("isHidden", False), "SECURITY ALERT: Hidden test case returned to learner!"
    print(f"   [PASS] Problem retrieved. Public test cases: {len(prob.get('sampleTestCases', []))}. Hidden tests safely redacted.")

    # 4. SUBMIT REAL CORRECT SOLUTION (Python twoSum)
    print("\n[Step 4] Submitting correct solution (Accepted expectation)...")
    correct_code = """
def twoSum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []
"""
    st, sub_res = make_req("POST", "/submissions", {
        "problemId": "prob-two-sum",
        "contestId": "contest-spring-2026",
        "sourceCode": correct_code,
        "language": "python"
    }, token=user_token)
    assert st == 201 or st == 200, f"Submission failed: {sub_res}"
    sub_id = sub_res["id"]
    print(f"   Submission created: {sub_id}")

    # Poll or verify verdict
    time.sleep(1)
    st, sub_details = make_req("GET", f"/submissions/{sub_id}", token=user_token)
    print(f"   Verdict: {sub_details.get('verdict')} | Score: {sub_details.get('score')} | Execution: {sub_details.get('executionTimeMs')}ms")
    assert sub_details.get("verdict") == "ACCEPTED", f"Expected ACCEPTED, got {sub_details.get('verdict')}"
    assert sub_details.get("score") == 100, f"Expected 100 score, got {sub_details.get('score')}"
    print("   [PASS] Real Python code executed in sandbox and passed all test cases!")

    # 5. SUBMIT REAL WRONG ANSWER SOLUTION
    print("\n[Step 5] Submitting flawed solution (Wrong Answer expectation)...")
    wa_code = """
def twoSum(nums, target):
    return [0, 0] # Intentionally wrong indices
"""
    st, wa_res = make_req("POST", "/submissions", {
        "problemId": "prob-two-sum",
        "contestId": "contest-spring-2026",
        "sourceCode": wa_code,
        "language": "python"
    }, token=user_token)
    wa_id = wa_res["id"]
    time.sleep(1)
    st, wa_details = make_req("GET", f"/submissions/{wa_id}", token=user_token)
    print(f"   Verdict: {wa_details.get('verdict')} | Score: {wa_details.get('score')} | Failure: {wa_details.get('failureReason')}")
    assert wa_details.get("verdict") == "WRONG_ANSWER", f"Expected WRONG_ANSWER, got {wa_details.get('verdict')}"
    print("   [PASS] Flawed code correctly identified as WRONG_ANSWER by judge engine.")

    # 6. SUBMIT REAL INFINITE LOOP (Time Limit Exceeded expectation)
    print("\n[Step 6] Submitting infinite loop (Time Limit Exceeded expectation)...")
    tle_code = """
def twoSum(nums, target):
    while True:
        pass
"""
    st, tle_res = make_req("POST", "/submissions", {
        "problemId": "prob-two-sum",
        "contestId": "contest-spring-2026",
        "sourceCode": tle_code,
        "language": "python"
    }, token=user_token)
    tle_id = tle_res["id"]
    time.sleep(3)
    st, tle_details = make_req("GET", f"/submissions/{tle_id}", token=user_token)
    print(f"   Verdict: {tle_details.get('verdict')} | Execution: {tle_details.get('executionTimeMs')}ms")
    assert tle_details.get("verdict") == "TIME_LIMIT_EXCEEDED", f"Expected TIME_LIMIT_EXCEEDED, got {tle_details.get('verdict')}"
    print("   [PASS] Infinite loop cleanly terminated by sandbox timeout watcher.")

    # 7. LEADERBOARD VERIFICATION
    print("\n[Step 7] Checking live leaderboard update...")
    st, lb = make_req("GET", "/contests/contest-spring-2026/leaderboard")
    assert st == 200, f"Failed to get leaderboard: {lb}"
    found_user = any(entry.get("userId") == user_id for entry in lb)
    print(f"   Leaderboard contains {len(lb)} entries. New user present: {found_user}")
    assert found_user, "Leaderboard was not updated after accepted submission!"
    print("   [PASS] Leaderboard updated dynamically.")

    # 8. SUBMISSION HISTORY
    print("\n[Step 8] Verifying user submission history...")
    st, history = make_req("GET", "/users/me/submissions", token=user_token)
    assert st == 200, f"Failed to get history: {history}"
    assert len(history) >= 3, f"Expected at least 3 submissions in history, found {len(history)}"
    print(f"   [PASS] History verified with {len(history)} submissions.")

    # 9. INFORMATION SECURITY (Learner A cannot access Learner B's code)
    print("\n[Step 9] Security Check: Attempting unauthorized submission access...")
    # Seeded user usr-learner-01 has submission sub-fail-001
    st, sec_res = make_req("GET", "/submissions/sub-fail-001", token=user_token)
    # The source code MUST be redacted or return 403
    source_code = sec_res.get("sourceCode", "")
    assert source_code == "[REDACTED - PRIVATE CODE]" or st == 403, f"SECURITY BREACH: Private source code exposed to peer! St: {st}, Code: {source_code}"
    print("   [PASS] Peer private submission code protected with redaction/403.")

    # 10. AI DIAGNOSIS GROUNDED WITH EVIDENCE
    print("\n[Step 10] Testing AI diagnosis on WRONG_ANSWER submission...")
    st, ai_res = make_req("POST", "/chat", {
        "question": "Why did my submission get Wrong Answer?",
        "submissionId": wa_id,
        "userId": user_id,
        "userRole": "learner"
    }, base_url=AI_URL)
    assert st == 200, f"AI Chat failed: {ai_res}"
    print(f"   AI Confidence: {ai_res.get('confidence')}")
    print(f"   AI Observations: {ai_res.get('observations')}")
    print(f"   AI Evidence Items: {len(ai_res.get('evidence', []))}")
    assert len(ai_res.get("evidence", [])) > 0, "No evidence artifacts attached to AI answer!"
    print("   [PASS] AI diagnosis is domain-aware and grounded in actual submission test evidence.")

    print("\n" + "=" * 60)
    print("ALL 10 END-TO-END FLOW AUDIT CHECKS PASSED WITH ZERO ERRORS!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
