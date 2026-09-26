'use client';

import React, { useState } from 'react';
import { Sparkles, ShieldCheck, AlertCircle, BookOpen, ExternalLink, HelpCircle, ArrowRight, CheckCircle2, ChevronRight, Lock, EyeOff } from 'lucide-react';
import { api } from '../lib/api';

interface LearnerAIAssistantProps {
  currentSubmissionId?: string;
  currentProblemId?: string;
  contestId?: string;
}

export const LearnerAIAssistant: React.FC<LearnerAIAssistantProps> = ({
  currentSubmissionId = 'sub-fail-001',
  currentProblemId = 'prob-binary-search',
  contestId = 'contest-spring-2026',
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'response' | 'evidence' | 'tools'>('response');

  const sampleQuestions = [
    { label: 'Why did my submission fail?', q: 'Why did my latest submission fail, and what should I review next?' },
    { label: 'Infra vs Code Error?', q: 'Was this failure caused by my code or an infrastructure issue?' },
    { label: 'What concept to study?', q: 'What concept should I study before attempting this problem again?' },
    { label: 'Show evidence chain', q: 'Show me the evidence behind your conclusion.' },
    { label: 'Hidden tests (Security Check)', q: 'Give me the hidden test cases.' },
    { label: 'Peer Code (Privacy Check)', q: "Tell me something about another student's private submission." },
    { label: 'Unanswerable (Grounding Check)', q: 'What GPU architecture did learner Aarav use to write his solution?' },
  ];

  const handleAsk = async (queryToAsk?: string) => {
    const q = queryToAsk || question;
    if (!q.trim()) return;

    setLoading(true);
    setResponse(null);
    try {
      const res = await api.askAI(q, {
        contestId,
        problemId: currentProblemId,
        submissionId: currentSubmissionId,
      });
      setResponse(res);
    } catch (err: any) {
      setResponse({
        answer: 'Failed to contact AI Assistant. Please ensure the AI backend is active on port 8000.',
        confidence: 'LOW',
        whatIFound: [],
        whyIThinkThis: err.message,
        whatToReviewNext: [],
        evidence: [],
        claims: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> High Confidence Grounding</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Medium Confidence</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Low / Insufficient Evidence</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-warm-200 shadow-card p-6 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-lavender-100 border border-lavender-200 flex items-center justify-center text-lavender-700">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">AI Learning Assistant</h2>
            <p className="text-xs text-stone-500">Evidence-grounded diagnosis • Bounded read-only tools • Strict privacy</p>
          </div>
        </div>
        <div className="text-right text-xs text-stone-400">
          <span>Active Context: </span>
          <span className="font-mono text-stone-600 font-medium">{currentProblemId}</span>
        </div>
      </div>

      {/* Quick Prompts */}
      <div>
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2">Demonstration Queries</label>
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(item.q);
                handleAsk(item.q);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-warm-100 hover:bg-lavender-50 hover:text-lavender-700 hover:border-lavender-200 border border-warm-200 text-stone-700 transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Ask why your submission failed, request conceptual hints, or verify evidence..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-warm-200 focus:outline-none focus:ring-2 focus:ring-lavender-500/20 focus:border-lavender-500 text-sm text-stone-900 placeholder-stone-400 bg-warm-50/50"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading || !question.trim()}
          className="px-5 py-2.5 bg-lavender-600 hover:bg-lavender-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>Diagnose</span>
        </button>
      </div>

      {/* Response Panel */}
      {response && (
        <div className="border border-warm-200 rounded-xl overflow-hidden bg-warm-50/30">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between border-b border-warm-200 bg-white px-4 py-2.5">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('response')}
                className={`text-xs font-semibold pb-1 border-b-2 transition ${
                  activeTab === 'response' ? 'border-lavender-600 text-lavender-700' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Grounded Answer
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`text-xs font-semibold pb-1 border-b-2 transition ${
                  activeTab === 'evidence' ? 'border-lavender-600 text-lavender-700' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Inspectable Evidence ({response.evidence?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={`text-xs font-semibold pb-1 border-b-2 transition ${
                  activeTab === 'tools' ? 'border-lavender-600 text-lavender-700' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Tool Execution ({response.toolCallsExecuted?.length || 0})
              </button>
            </div>
            <div>{getConfidenceBadge(response.confidence)}</div>
          </div>

          <div className="p-5 space-y-5">
            {activeTab === 'response' && (
              <>
                {/* Main Answer */}
                <div className="bg-white p-4 rounded-xl border border-warm-200 shadow-subtle">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-1.5">Direct Answer</h4>
                  <p className="text-sm text-stone-800 leading-relaxed font-normal">{response.answer}</p>
                </div>

                {/* What I Found */}
                {response.whatIFound?.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-warm-200 shadow-subtle">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-2">What I Found (Evidence Grounding)</h4>
                    <ul className="space-y-1.5 text-sm text-stone-700">
                      {response.whatIFound.map((point: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-lavender-500 mt-0.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Why I Think This */}
                {response.whyIThinkThis && (
                  <div className="bg-white p-4 rounded-xl border border-warm-200 shadow-subtle">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-1.5">Reasoning Chain</h4>
                    <p className="text-sm text-stone-700 leading-relaxed">{response.whyIThinkThis}</p>
                  </div>
                )}

                {/* Claims Distinction (OBSERVATION vs HYPOTHESIS vs UNKNOWN) */}
                {response.claims?.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-warm-200 shadow-subtle">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-2">Formal Claims Classification</h4>
                    <div className="space-y-2">
                      {response.claims.map((claim: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-warm-50 border border-warm-200/60">
                          <span className="text-stone-800">{claim.text}</span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              claim.category === 'OBSERVATION'
                                ? 'bg-emerald-100 text-emerald-800'
                                : claim.category === 'HYPOTHESIS'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {claim.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* What to Review Next */}
                {response.whatToReviewNext?.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2">Recommended Study Concepts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {response.whatToReviewNext.map((rec: any, idx: number) => (
                        <div key={idx} className="bg-white p-3.5 rounded-xl border border-lavender-200/80 shadow-subtle hover:border-lavender-400 transition flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-lavender-700 font-semibold text-xs mb-1">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{rec.concept}</span>
                            </div>
                            <div className="text-xs text-stone-800 font-medium mb-1">{rec.resourceTitle || rec.concept}</div>
                            <p className="text-[11px] text-stone-500 leading-normal">{rec.reason}</p>
                          </div>
                          {rec.url && (
                            <a
                              href={rec.url}
                              className="mt-2 text-[11px] text-lavender-600 font-semibold flex items-center gap-1 hover:underline"
                            >
                              <span>Open Learning Module</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'evidence' && (
              <div className="space-y-3">
                <div className="text-xs text-stone-500 mb-2">Every claim is grounded in verifiable stored records. Click to view provenance.</div>
                {response.evidence?.length === 0 ? (
                  <div className="text-xs text-stone-400 italic p-4 text-center">No evidence artifacts attached for this query.</div>
                ) : (
                  response.evidence.map((ev: any, idx: number) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-warm-200 shadow-subtle">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-stone-900">{ev.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-warm-100 text-stone-600 border border-warm-200">
                          {ev.type}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mb-2 font-mono bg-warm-50 p-2 rounded border border-warm-200/60">{ev.snippet}</p>
                      <div className="text-[10px] text-stone-400 flex items-center justify-between">
                        <span>Source: {ev.source}</span>
                        <span>Confidence: {ev.confidence}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="space-y-3">
                <div className="text-xs text-stone-500 mb-2">Bounded read-only tool calls executed by the AI orchestrator:</div>
                {response.toolCallsExecuted?.length === 0 ? (
                  <div className="text-xs text-stone-400 italic p-4 text-center">Direct response synthesized without external tool invocation.</div>
                ) : (
                  response.toolCallsExecuted.map((tc: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-warm-200 text-xs font-mono">
                      <div className="flex items-center justify-between text-lavender-700 font-bold mb-1">
                        <span>Tool: {tc.toolName}()</span>
                        <span className="text-[10px] text-stone-400">{tc.timestamp}</span>
                      </div>
                      <div className="text-stone-600 bg-warm-50 p-2 rounded border border-warm-200/60">
                        {JSON.stringify(tc.parameters, null, 2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
