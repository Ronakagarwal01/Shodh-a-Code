#!/usr/bin/env bash
# ==============================================================================
# Shodh-a-Code Cross-Platform Master Evaluation Script
# ==============================================================================
set -e

echo "=============================================================================="
echo ">>> SHODH-A-CODE — FULL AUTOMATED EVALUATION SUITE <<<"
echo "=============================================================================="

echo ""
echo "=== [1/6] Environment & Python Runtime Verification ==="
python3 --version || python --version

echo ""
echo "=== [2/6] Judge Sandbox Isolation & Security Tests ==="
cd judge-worker
npm run test:security
cd ..

echo ""
echo "=== [3/6] AI Service Unit & Domain Grounding Tests ==="
cd ai-service
python tests/test_runner.py
cd ..

echo ""
echo "=== [4/6] Core 10-Scenario End-to-End Contract Test Suite ==="
python tests/test_e2e_suite.py

echo ""
echo "=== [5/6] Hybrid Retrieval & Multi-Hop GraphRAG Empirical Benchmark ==="
python scripts/run_hybrid_benchmark.py

echo ""
echo "=== [6/6] Live API Critical Submission & Real Code Execution Flow ==="
python tests/test_live_submission_flow.py

echo ""
echo "=============================================================================="
echo ">>> ALL 6 MASTER EVALUATION STAGES PASSED WITH ZERO ERRORS! <<<"
echo "=============================================================================="
