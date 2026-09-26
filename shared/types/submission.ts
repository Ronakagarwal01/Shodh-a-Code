export enum SubmissionVerdict {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  JUDGE_ERROR = 'JUDGE_ERROR', // Distinct from student code error!
}

export interface TestExecutionResult {
  testCaseId: string;
  orderIndex: number;
  isHidden: boolean;
  passed: boolean;
  verdict: SubmissionVerdict;
  executionTimeMs: number;
  memoryUsageKb: number;
  // For visible test cases only; redacted for hidden
  actualOutput?: string;
  expectedOutput?: string;
  input?: string;
  errorMessage?: string;
}

export interface Submission {
  id: string;
  userId: string;
  contestId?: string | null;
  problemId: string;
  sourceCode: string;
  language: string; // 'python', 'javascript', 'cpp', etc.
  verdict: SubmissionVerdict;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  executionTimeMs: number;
  memoryUsageKb: number;
  score: number;
  judgeVersion: string;
  failureReason?: string;
  testResults: TestExecutionResult[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionDto {
  problemId: string;
  contestId?: string;
  sourceCode: string;
  language: string;
}
