export enum ProblemDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface TestCase {
  id: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  orderIndex: number;
  explanation?: string;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  statement: string;
  difficulty: ProblemDifficulty;
  constraints: string[];
  examples: ProblemExample[];
  tags: string[];
  contestId?: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  points: number;
  starterCode?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Sanitized version for learners (never contains hidden test cases)
export interface ProblemPublicView extends Omit<Problem, 'testCases'> {
  sampleTestCases: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    explanation?: string;
  }>;
}
