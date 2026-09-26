#!/usr/bin/env python3
"""
Shodh-a-Code Full Automated Cross-Platform Evaluation Script
Executes all unit, security, integration, AI grounding, LLM fallback,
complexity, retrieval, and live API execution test suites.
Exits with code 0 on success, non-zero on failure.
"""

import os
import sys
import subprocess

def run_step(step_num: int, total_steps: int, title: str, cmd: str, cwd: str = "."):
    print("\n" + "=" * 80)
    print(f"=== [{step_num}/{total_steps}] {title} ===")
    print("=" * 80)
    print(f"Running command: {cmd} (cwd: {cwd})")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"\n[ERROR] Step [{step_num}/{total_steps}] '{title}' FAILED with exit code {res.returncode}")
        sys.exit(res.returncode)
    print(f"[PASS] Step [{step_num}/{total_steps}] completed successfully.")

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print("=" * 80)
    print("SHODH-A-CODE FULL AUTOMATED EVALUATION SUITE")
    print("=" * 80)

    total_steps = 7

    # 1. Environment verification
    run_step(1, total_steps, "Environment and Runtime Verification", "python --version", cwd=root_dir)

    # 2. Judge Sandbox Security Tests
    run_step(2, total_steps, "Judge Sandbox Isolation & Security Tests", "npm run test:security", cwd=os.path.join(root_dir, "judge-worker"))

    # 3. AI Service Domain & Grounding Tests
    run_step(3, total_steps, "AI Service Domain Grounding & Unit Tests", "python tests/test_runner.py", cwd=os.path.join(root_dir, "ai-service"))

    # 4. Real LLM Integration & Fallback Tests
    run_step(4, total_steps, "LLM Provider Abstraction & Fallback Tests", "python tests/test_llm_integration.py", cwd=os.path.join(root_dir, "ai-service"))

    # 5. Core 10-Scenario End-to-End Contract Suite
    run_step(5, total_steps, "Core 10-Scenario E2E Contract Suite", "python tests/test_e2e_suite.py", cwd=root_dir)

    # 6. Algorithmic Complexity Benchmarks (N=100, 1000, 10000)
    run_step(6, total_steps, "Algorithmic Complexity Benchmark Suite", "python scripts/benchmark_complexity.py", cwd=root_dir)

    # 7. Live API Critical Submission & Code Execution Flow
    run_step(7, total_steps, "Live API Critical Submission & Real Code Flow", "python tests/test_live_submission_flow.py", cwd=root_dir)

    print("\n" + "=" * 80)
    print(">>> ALL 7 MASTER EVALUATION STAGES PASSED WITH ZERO ERRORS! <<<")
    print("=" * 80)

if __name__ == "__main__":
    main()
