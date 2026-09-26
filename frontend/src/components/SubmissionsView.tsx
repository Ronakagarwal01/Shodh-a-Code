'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, Cpu, CheckCircle2, XCircle, Sparkles, ShieldAlert, AlertCircle, FileCode2 } from 'lucide-react';
import { api } from '../lib/api';

interface SubmissionsViewProps {
  onOpenAIForSubmission: (subId: string, probId: string) => void;
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({ onOpenAIForSubmission }) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [securityTestResult, setSecurityTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await api.getMySubmissions();
      setSubmissions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTestUnauthorizedAccess = async () => {
    setSecurityTestResult(null);
    try {
      // Learner Ronak attempting to access Learner Priya's submission
      await api.getSubmission('sub-fail-002');
      setSecurityTestResult('FAIL: Security check failed; unauthorized access was permitted.');
    } catch (err: any) {
      setSecurityTestResult(`SUCCESS (403 Blocked): ${err.message}`);
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
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="w-4 h-4 text-lavender-600" />
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Audit & History</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Submission Evaluation History</h1>
          <p className="text-xs text-stone-500 mt-1">Traceable submission logs, sandbox execution metrics, and AI failure diagnostics.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTestUnauthorizedAccess}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Test Unauthorized Access (403 Test)</span>
          </button>
        </div>
      </div>

      {/* Security Test Notice Banner */}
      {securityTestResult && (
        <div className={`p-4 rounded-xl text-xs font-mono border ${
          securityTestResult.startsWith('SUCCESS') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {securityTestResult}
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-card overflow-hidden">
        <table className="min-w-full divide-y divide-warm-200">
          <thead className="bg-warm-50/70">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Submission ID</th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Problem</th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Verdict</th>
              <th className="px-6 py-3.5 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Execution Time</th>
              <th className="px-6 py-3.5 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Memory</th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100 text-sm">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400 text-xs">
                  No submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr key={s.id} className="hover:bg-warm-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-stone-800">
                    {s.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-800 font-medium">
                    {s.problemId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getVerdictStyle(s.verdict)}`}>
                      {s.verdict}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-stone-500 font-mono">
                    {s.executionTimeMs}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-stone-500 font-mono">
                    {s.memoryUsageKb}KB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => onOpenAIForSubmission(s.id, s.problemId)}
                      className="px-3 py-1.5 bg-lavender-50 hover:bg-lavender-100 text-lavender-700 border border-lavender-200 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Diagnose</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
