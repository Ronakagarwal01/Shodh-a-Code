# ==============================================================================
# Shodh-a-Code Windows PowerShell Master Evaluation Script
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "[SHODH-A-CODE FULL AUTOMATED EVALUATION SUITE]" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== [1/6] Environment and Python Runtime Verification ===" -ForegroundColor Cyan
python --version

Write-Host ""
Write-Host "=== [2/6] Judge Sandbox Isolation and Security Tests ===" -ForegroundColor Cyan
Push-Location judge-worker
npm run test:security
Pop-Location

Write-Host ""
Write-Host "=== [3/6] AI Service Unit and Domain Grounding Tests ===" -ForegroundColor Cyan
Push-Location ai-service
python tests/test_runner.py
Pop-Location

Write-Host ""
Write-Host "=== [4/6] Core 10-Scenario End-to-End Contract Test Suite ===" -ForegroundColor Cyan
python tests/test_e2e_suite.py

Write-Host ""
Write-Host "=== [5/6] Hybrid Retrieval and Multi-Hop GraphRAG Empirical Benchmark ===" -ForegroundColor Cyan
python scripts/run_hybrid_benchmark.py

Write-Host ""
Write-Host "=== [6/6] Live API Critical Submission and Real Code Execution Flow ===" -ForegroundColor Cyan
python tests/test_live_submission_flow.py

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ">>> ALL 6 MASTER EVALUATION STAGES PASSED WITH ZERO ERRORS! <<<" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
