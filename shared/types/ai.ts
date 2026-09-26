export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ClaimCategory = 'OBSERVATION' | 'HYPOTHESIS' | 'UNKNOWN';

export interface ObservationClaim {
  text: string;
  category: ClaimCategory;
  supportingEvidenceIds: string[];
}

export interface EvidenceItem {
  id: string;
  type: 'SUBMISSION' | 'PROBLEM' | 'JUDGE_RUN' | 'LEARNING_MATERIAL' | 'INCIDENT' | 'GRAPH_PATH';
  title: string;
  source: string;
  snippet: string;
  metadata?: Record<string, any>;
  confidence: ConfidenceLevel;
  timestamp?: string;
  isStale?: boolean;
}

export interface ConflictNotice {
  detected: boolean;
  explanation?: string;
  newerEvidenceId?: string;
  olderEvidenceId?: string;
  resolutionStrategy?: string;
}

export interface AIResponse {
  answer: string;
  whatIFound: string[];
  whyIThinkThis: string;
  whatToReviewNext: Array<{
    concept: string;
    resourceTitle?: string;
    resourceSlug?: string;
    url?: string;
    reason: string;
  }>;
  confidence: ConfidenceLevel;
  evidence: EvidenceItem[];
  claims: ObservationClaim[];
  conflictNotice?: ConflictNotice;
  isUnanswerable?: boolean;
  toolCallsExecuted: Array<{
    toolName: string;
    parameters: Record<string, any>;
    timestamp: string;
  }>;
}

export interface AIChatRequest {
  question: string;
  contestId?: string;
  problemId?: string;
  submissionId?: string;
  userId: string;
  userRole: 'learner' | 'instructor' | 'admin';
}

export interface InstructorInvestigationRequest {
  contestId: string;
  query: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
}

export interface InstructorInvestigationReport {
  query: string;
  contestId: string;
  timeline: Array<{
    timestamp: string;
    event: string;
    details: string;
    type: 'DEPLOYMENT' | 'INCIDENT' | 'SUBMISSION_SPIKE' | 'ROLLBACK';
  }>;
  affectedSubmissionsCount: number;
  verdictDistribution: Record<string, number>;
  problemFailurePatterns: Array<{
    problemId: string;
    problemTitle: string;
    failureCount: number;
    predominantError: string;
    suspectedCause: string;
  }>;
  aiConclusion: string;
  confidence: ConfidenceLevel;
  evidence: EvidenceItem[];
}
