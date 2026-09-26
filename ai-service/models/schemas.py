from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

ConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]
ClaimCategory = Literal["OBSERVATION", "HYPOTHESIS", "UNKNOWN"]
EvidenceType = Literal["SUBMISSION", "PROBLEM", "JUDGE_RUN", "LEARNING_MATERIAL", "INCIDENT", "GRAPH_PATH"]

class EvidenceItem(BaseModel):
    id: str
    type: EvidenceType
    title: str
    source: str
    snippet: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    confidence: ConfidenceLevel = "HIGH"
    timestamp: Optional[str] = None
    isStale: bool = False

class ObservationClaim(BaseModel):
    text: str
    category: ClaimCategory
    supportingEvidenceIds: List[str] = Field(default_factory=list)

class ConflictNotice(BaseModel):
    detected: bool = False
    explanation: Optional[str] = None
    newerEvidenceId: Optional[str] = None
    olderEvidenceId: Optional[str] = None
    resolutionStrategy: Optional[str] = None

class ReviewRecommendation(BaseModel):
    concept: str = "General Algorithms"
    resourceTitle: Optional[str] = None
    resourceSlug: Optional[str] = None
    url: Optional[str] = None
    reason: str = "Recommended foundational concept review."

class ToolCallRecord(BaseModel):
    toolName: str
    parameters: Dict[str, Any]
    timestamp: str

class AIResponse(BaseModel):
    answer: str
    whatIFound: List[str]
    whyIThinkThis: str
    whatToReviewNext: List[ReviewRecommendation] = Field(default_factory=list)
    confidence: ConfidenceLevel
    evidence: List[EvidenceItem] = Field(default_factory=list)
    claims: List[ObservationClaim] = Field(default_factory=list)
    conflictNotice: Optional[ConflictNotice] = None
    isUnanswerable: bool = False
    isAmbiguous: bool = False
    generationMode: Literal["llm", "deterministic_fallback"] = "deterministic_fallback"
    provider: Optional[str] = None
    modelName: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    contradictions: List[str] = Field(default_factory=list)
    toolCallsExecuted: List[ToolCallRecord] = Field(default_factory=list)

class AIChatRequest(BaseModel):
    question: str
    contestId: Optional[str] = None
    problemId: Optional[str] = None
    submissionId: Optional[str] = None
    userId: str
    userRole: Literal["learner", "instructor", "admin"] = "learner"

class TimelineEvent(BaseModel):
    timestamp: str
    event: str
    details: str
    type: Literal["DEPLOYMENT", "INCIDENT", "SUBMISSION_SPIKE", "ROLLBACK"]

class ProblemFailurePattern(BaseModel):
    problemId: str
    problemTitle: str
    failureCount: int
    predominantError: str
    suspectedCause: str

class InstructorInvestigationRequest(BaseModel):
    contestId: str
    query: str
    timeRangeStart: Optional[str] = None
    timeRangeEnd: Optional[str] = None

class InstructorInvestigationReport(BaseModel):
    query: str
    contestId: str
    timeline: List[TimelineEvent]
    affectedSubmissionsCount: int
    verdictDistribution: Dict[str, int]
    problemFailurePatterns: List[ProblemFailurePattern]
    aiConclusion: str
    confidence: ConfidenceLevel
    evidence: List[EvidenceItem]
