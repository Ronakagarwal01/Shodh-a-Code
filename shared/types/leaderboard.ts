export interface ProblemScore {
  problemId: string;
  solved: boolean;
  score: number;
  attempts: number;
  timeToSolveMinutes: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  totalScore: number;
  solvedCount: number;
  totalPenaltyMinutes: number;
  problemScores: Record<string, ProblemScore>;
  lastSubmissionTime?: string;
}

export interface ContestLeaderboard {
  contestId: string;
  contestTitle: string;
  updatedAt: string;
  entries: LeaderboardEntry[];
}
