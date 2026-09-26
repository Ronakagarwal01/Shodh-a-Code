export enum SubmissionVerdict {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  JUDGE_ERROR = 'JUDGE_ERROR',
}

export interface JudgeJobData {
  submissionId: string;
  problemId: string;
  sourceCode: string;
  language: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  contestId?: string;
  userId: string;
  username: string;
  displayName: string;
}

export interface SandboxExecutionOptions {
  sourceCode: string;
  input: string;
  language: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  memoryUsageKb: number;
  isTimeout: boolean;
  isMemoryExceeded: boolean;
  isInfrastructureError: boolean;
  errorMessage?: string;
}
