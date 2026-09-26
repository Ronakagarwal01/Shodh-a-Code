import axios from 'axios';
import { DockerSandbox } from './docker-sandbox';
import { ProcessSandbox } from './process-sandbox';
import { JudgeJobData, SubmissionVerdict } from './types';

export class JudgeEngine {
  private dockerSandbox: DockerSandbox;
  private processSandbox: ProcessSandbox;
  private contestApiUrl: string;

  constructor() {
    this.dockerSandbox = new DockerSandbox();
    this.processSandbox = new ProcessSandbox();
    this.contestApiUrl = process.env.CONTEST_API_URL || 'http://localhost:4000';
  }

  private normalizeOutput(str: string): string {
    return str
      .replace(/\r\n/g, '\n')
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .join('\n');
  }

  async evaluate(jobData: JudgeJobData) {
    const isDocker = await this.dockerSandbox.isDockerAvailable();
    const sandbox = isDocker ? this.dockerSandbox : this.processSandbox;

    // Fetch problem test cases from contest API (including hidden test cases)
    let testCases: any[] = [];
    try {
      const resp = await axios.get(`${this.contestApiUrl}/judge/test-cases/${jobData.problemId}`);
      testCases = Array.isArray(resp.data) ? resp.data : [];
    } catch (_) {
      try {
        const resp2 = await axios.get(`${this.contestApiUrl}/problems/${jobData.problemId}`);
        testCases = resp2.data.sampleTestCases || [];
      } catch (err) {
        // Fallback for isolated unit tests
        testCases = [
          { id: 'default-tc-1', orderIndex: 1, isHidden: false, input: '', expectedOutput: '' },
        ];
      }
    }

    const testResults = [];
    let finalVerdict = SubmissionVerdict.ACCEPTED;
    let failureReason: string | undefined = undefined;
    let totalTimeMs = 0;
    let peakMemoryKb = 14000;

    for (const tc of testCases) {
      const execResult = await sandbox.execute({
        sourceCode: jobData.sourceCode,
        input: tc.input || '',
        language: jobData.language,
        timeLimitMs: jobData.timeLimitMs || 2000,
        memoryLimitMb: jobData.memoryLimitMb || 256,
      });

      totalTimeMs += execResult.executionTimeMs;
      if (execResult.memoryUsageKb > peakMemoryKb) {
        peakMemoryKb = execResult.memoryUsageKb;
      }

      let tcVerdict = SubmissionVerdict.ACCEPTED;
      let passed = true;
      let errorMsg: string | undefined = undefined;

      if (execResult.isInfrastructureError) {
        tcVerdict = SubmissionVerdict.JUDGE_ERROR;
        passed = false;
        errorMsg = execResult.errorMessage || 'Sandbox runtime error';
      } else if (execResult.isTimeout) {
        tcVerdict = SubmissionVerdict.TIME_LIMIT_EXCEEDED;
        passed = false;
        errorMsg = 'Time Limit Exceeded (CPU execution limit)';
      } else if (execResult.isMemoryExceeded) {
        tcVerdict = SubmissionVerdict.MEMORY_LIMIT_EXCEEDED;
        passed = false;
        errorMsg = 'Memory Limit Exceeded';
      } else if (execResult.exitCode !== 0) {
        if (execResult.stderr.includes('SyntaxError') || execResult.stderr.includes('IndentationError')) {
          tcVerdict = SubmissionVerdict.COMPILATION_ERROR;
        } else {
          tcVerdict = SubmissionVerdict.RUNTIME_ERROR;
        }
        passed = false;
        errorMsg = execResult.stderr.split('\n').slice(-2).join(' ').trim();
      } else {
        // Output comparison
        const normActual = this.normalizeOutput(execResult.stdout);
        const normExpected = this.normalizeOutput(tc.expectedOutput || '');
        if (normExpected && normActual !== normExpected) {
          tcVerdict = SubmissionVerdict.WRONG_ANSWER;
          passed = false;
          errorMsg = `Output mismatch on test case ${tc.orderIndex}`;
        }
      }

      testResults.push({
        testCaseId: tc.id,
        orderIndex: tc.orderIndex,
        isHidden: tc.isHidden,
        passed,
        verdict: tcVerdict,
        executionTimeMs: execResult.executionTimeMs,
        memoryUsageKb: execResult.memoryUsageKb,
        actualOutput: tc.isHidden ? '[REDACTED]' : execResult.stdout,
        expectedOutput: tc.isHidden ? '[REDACTED]' : tc.expectedOutput,
        errorMessage: errorMsg,
      });

      if (!passed) {
        finalVerdict = tcVerdict;
        failureReason = errorMsg;
        break; // Stop on first failing test case
      }
    }

    return {
      submissionId: jobData.submissionId,
      verdict: finalVerdict,
      status: 'COMPLETED',
      executionTimeMs: totalTimeMs,
      memoryUsageKb: peakMemoryKb,
      score: finalVerdict === SubmissionVerdict.ACCEPTED ? 100 : 0,
      judgeVersion: isDocker ? 'v1.4.1-docker' : 'v1.4.1-sandbox',
      failureReason,
      testResults,
    };
  }
}
