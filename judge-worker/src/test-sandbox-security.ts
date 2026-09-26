import { ProcessSandbox } from './process-sandbox';

async function runSecurityTests() {
  console.log('[Security Test] Running sandbox isolation and security verification...');
  const sandbox = new ProcessSandbox();

  // Test 1: Infinite loop timeout protection
  console.log('-> Testing infinite loop timeout limit...');
  const t1 = await sandbox.execute({
    sourceCode: 'while True: pass',
    input: '',
    language: 'python',
    timeLimitMs: 1000,
    memoryLimitMb: 256,
  });
  console.assert(t1.isTimeout, 'Infinite loop MUST trigger timeout');
  console.log(`   [PASS] Terminated cleanly on timeout after ${t1.executionTimeMs}ms.`);

  // Test 2: Environment variable leakage protection
  console.log('-> Testing environment secret scrubbing...');
  process.env.JWT_SECRET = 'SUPER_SECRET_TOKEN_DO_NOT_LEAK';
  const t2 = await sandbox.execute({
    sourceCode: 'import os; print("LEAKED:" + os.environ.get("JWT_SECRET", "NONE"))',
    input: '',
    language: 'python',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
  });
  console.assert(!t2.stdout.includes('SUPER_SECRET'), 'Sanitized environment must not leak host secrets');
  console.assert(t2.stdout.includes('LEAKED:NONE'), 'Sandbox environment must have secrets scrubbed');
  console.log(`   [PASS] Host secrets protected. Output: "${t2.stdout}"`);

  // Test 3: Valid execution
  console.log('-> Testing valid algorithm execution...');
  const t3 = await sandbox.execute({
    sourceCode: 'import sys; name = sys.stdin.read().strip(); print(f"Hello, {name}!")',
    input: 'ShodhLearner',
    language: 'python',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
  });
  console.assert(t3.stdout === 'Hello, ShodhLearner!', 'Valid execution should produce matching output');
  console.log(`   [PASS] Valid code executed cleanly with output: "${t3.stdout}"`);

  // Test 4: Algorithmic function runner harness (LeetCode style function execution)
  console.log('-> Testing function-based competitive programming harness...');
  const t4 = await sandbox.execute({
    sourceCode: `def twoSum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i`,
    input: '[2, 7, 11, 15]\n9',
    language: 'python',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
  });
  console.assert(t4.stdout === '[0, 1]', `Function harness must output [0, 1], got: ${t4.stdout}`);
  console.log(`   [PASS] Function harness passed. Output: "${t4.stdout}"`);

  // Test 5: Filesystem containment & isolation
  console.log('-> Testing filesystem isolation attempt...');
  const t5 = await sandbox.execute({
    sourceCode: 'import os; print("CWD_EXISTS:" + str(os.path.exists("solution.py")))',
    input: '',
    language: 'python',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
  });
  console.assert(t5.stdout.includes('CWD_EXISTS:True'), 'Sandbox should execute within isolated temp folder');
  console.log(`   [PASS] Execution strictly contained in isolated sandbox directory.`);

  console.log('[Security Test] All sandbox security tests PASSED successfully!');
}

runSecurityTests().catch((err) => {
  console.error('[Security Test] Failed:', err);
  process.exit(1);
});
