'use client';

import React, { useState, useEffect } from 'react';
import { Play, Send, CheckCircle2, XCircle, Clock, Cpu, Sparkles, AlertTriangle, FileCode2, BookOpen } from 'lucide-react';
import { api } from '../lib/api';
import { LearnerAIAssistant } from './LearnerAIAssistant';

interface CodeEditorViewProps {
  problemId: string;
  contestId?: string;
  onBack?: () => void;
}

export const CodeEditorView: React.FC<CodeEditorViewProps> = ({
  problemId = 'prob-binary-search',
  contestId = 'contest-spring-2026',
  onBack,
}) => {
  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    loadProblem();
  }, [problemId]);

  const loadProblem = async () => {
    try {
      const data = await api.getProblem(problemId);
      setProblem(data);
      if (data.starterCode?.[language]) {
        setCode(data.starterCode[language]);
      } else {
        setCode('def search(nums: list[int], target: int) -> int:\n    # Implement your solution\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmissionResult(null);
    try {
      const res = await api.submitCode(problemId, code, language, contestId);
      setSubmissionResult(res);

      // Poll for completion if queued/running
      if (res.status === 'PENDING' || res.status === 'PROCESSING') {
        const interval = setInterval(async () => {
          try {
            const updated = await api.getSubmission(res.id);
            if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
              setSubmissionResult(updated);
              clearInterval(interval);
              setSubmitting(false);
            }
          } catch (_) {
            clearInterval(interval);
            setSubmitting(false);
          }
        }, 1000);
      } else {
        setSubmitting(false);
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
      setSubmitting(false);
    }
  };

  const getVerdictStyle = (v: string) => {
    switch (v) {
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WRONG_ANSWER':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'TIME_LIMIT_EXCEEDED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RUNTIME_ERROR':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'JUDGE_ERROR':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Problem Topbar */}
      {problem && (
        <div className="bg-white p-5 rounded-2xl border border-warm-200 shadow-card flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                problem.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700' :
                problem.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {problem.difficulty}
              </span>
              <span className="text-xs text-stone-400 font-mono">• {problem.points} Points</span>
              <span className="text-xs text-stone-400 font-mono">• {problem.timeLimitMs}ms Limit</span>
            </div>
            <h1 className="text-xl font-bold text-stone-900">{problem.title}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                showAIAssistant ? 'bg-lavender-600 text-white border-lavender-600' : 'bg-lavender-50 text-lavender-700 border-lavender-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{showAIAssistant ? 'Close AI Assistant' : 'AI Learning Assistant'}</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-stone-700 rounded-xl text-xs font-semibold transition"
              >
                Back to Contest
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Problem Statement vs Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Problem Statement & Examples */}
        <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card space-y-5 overflow-y-auto max-h-[750px]">
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-2">Description</h3>
            <div className="text-sm text-stone-800 leading-relaxed whitespace-pre-line font-normal">
              {problem?.statement}
            </div>
          </div>

          {problem?.examples?.length > 0 && (
            <div>
              <h3 className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-2">Examples</h3>
              <div className="space-y-3">
                {problem.examples.map((ex: any, idx: number) => (
                  <div key={idx} className="bg-warm-50/60 p-3.5 rounded-xl border border-warm-200 text-xs font-mono space-y-1">
                    <div className="text-stone-500 font-semibold">Example {idx + 1}:</div>
                    <div><span className="text-stone-400 font-normal">Input: </span><span className="text-stone-900 font-bold">{ex.input}</span></div>
                    <div><span className="text-stone-400 font-normal">Output: </span><span className="text-stone-900 font-bold">{ex.output}</span></div>
                    {ex.explanation && (
                      <div className="text-stone-500 italic mt-1 font-sans text-[11px]">{ex.explanation}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {problem?.constraints?.length > 0 && (
            <div>
              <h3 className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-2">Constraints</h3>
              <ul className="list-disc list-inside text-xs text-stone-600 space-y-1">
                {problem.constraints.map((c: string, idx: number) => (
                  <li key={idx} className="font-mono">{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Code Editor & Result */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-warm-200 shadow-card overflow-hidden">
            {/* Editor Top Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-warm-50 border-b border-warm-200">
              <div className="flex items-center space-x-2">
                <FileCode2 className="w-4 h-4 text-stone-500" />
                <span className="text-xs font-bold text-stone-700">solution.py</span>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs bg-white border border-warm-200 rounded-lg px-2.5 py-1 text-stone-700 font-medium focus:outline-none"
                >
                  <option value="python">Python 3.11</option>
                  <option value="javascript">JavaScript (Node)</option>
                  <option value="cpp">C++ 20</option>
                </select>
              </div>
            </div>

            {/* Code Input Area */}
            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={16}
                spellCheck={false}
                className="w-full p-4 font-mono text-sm leading-relaxed text-stone-900 bg-warm-50/20 focus:outline-none resize-none selection:bg-lavender-100"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between p-3.5 bg-white border-t border-warm-200">
              <div className="text-xs text-stone-400 font-mono">
                {code.split('\n').length} lines • {code.length} characters
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-5 py-2 bg-lavender-600 hover:bg-lavender-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{submitting ? 'Judging in Sandbox...' : 'Submit to Judge'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Submission Verdict Card */}
          {submissionResult && (
            <div className="bg-white p-5 rounded-2xl border border-warm-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getVerdictStyle(submissionResult.verdict)}`}>
                    {submissionResult.verdict}
                  </span>
                  <span className="text-xs text-stone-500 font-mono">ID: {submissionResult.id}</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-stone-500 font-mono">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {submissionResult.executionTimeMs}ms</span>
                  <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {submissionResult.memoryUsageKb}KB</span>
                </div>
              </div>

              {submissionResult.failureReason && (
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-rose-800 font-mono">
                  {submissionResult.failureReason}
                </div>
              )}

              {/* Test Case Breakdown */}
              {submissionResult.testResults?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-warm-100">
                  <span className="text-xs font-bold text-stone-700 block">Evaluation Test Suite</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {submissionResult.testResults.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                          tr.passed ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-rose-50/60 border-rose-200 text-rose-800'
                        }`}
                      >
                        <span>Test #{tr.orderIndex || idx + 1}</span>
                        {tr.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* One-click Trigger for AI Failure Assistant */}
              {submissionResult.verdict !== 'ACCEPTED' && (
                <button
                  onClick={() => setShowAIAssistant(true)}
                  className="w-full mt-2 py-2.5 bg-lavender-50 hover:bg-lavender-100 text-lavender-700 border border-lavender-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Diagnose with AI Learning Assistant</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Embedded AI Assistant Panel */}
      {showAIAssistant && (
        <div className="pt-4">
          <LearnerAIAssistant
            currentSubmissionId={submissionResult?.id || 'sub-fail-001'}
            currentProblemId={problemId}
            contestId={contestId}
          />
        </div>
      )}
    </div>
  );
};
