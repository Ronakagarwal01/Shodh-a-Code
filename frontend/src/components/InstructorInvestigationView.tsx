'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, Search, Sparkles, Network, ArrowRight, Activity, Users, FileCode2 } from 'lucide-react';
import { api } from '../lib/api';

export const InstructorInvestigationView: React.FC = () => {
  const [query, setQuery] = useState('Did the judge deployment at 14:30 affect contest results?');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [graphGaps, setGraphGaps] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  useEffect(() => {
    handleInvestigate('Did the judge deployment at 14:30 affect contest results?');
  }, []);

  const handleInvestigate = async (queryText?: string) => {
    const q = queryText || query;
    if (!q) return;

    setLoading(true);
    try {
      const data = await api.investigateAI('contest-spring-2026', q);
      setReport(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunGraphRAG = async () => {
    setGraphLoading(true);
    try {
      const res = await api.askAI('Which learners may share a prerequisite gap despite having different failed submissions?', {
        contestId: 'contest-spring-2026',
      });
      setGraphGaps(res.claims || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGraphLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-coral-50 text-coral-600 border border-coral-200 uppercase tracking-wider">
              Instructor Intelligence Lab
            </span>
            <span className="text-xs text-stone-400">• Spring 2026 Contest</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Incident & Curriculum Investigation</h1>
          <p className="text-sm text-stone-600 mt-1">
            Correlate judge version deployments, submission failure anomalies, and multi-hop learner prerequisite gaps using GraphRAG.
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-card flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvestigate()}
            placeholder="E.g., Did the judge deployment at 14:30 affect contest results? or Investigate error spike..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 focus:outline-none focus:ring-2 focus:ring-lavender-500/20 focus:border-lavender-500 text-sm text-stone-900 bg-warm-50/50"
          />
        </div>
        <button
          onClick={() => handleInvestigate()}
          disabled={loading}
          className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-lavender-400" />
          )}
          <span>Investigate</span>
        </button>
      </div>

      {/* Investigation Report */}
      {report && (
        <div className="space-y-6">
          {/* AI Conclusion Banner */}
          <div className="bg-gradient-to-r from-lavender-50 via-warm-50 to-coral-50 p-6 rounded-2xl border border-lavender-200/80 shadow-subtle">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-lavender-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-stone-900">AI Grounded Conclusion</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                    High Confidence Evidence
                  </span>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed font-medium">{report.aiConclusion}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                  <span>Impacted Submissions: <strong className="text-stone-800">{report.affectedSubmissionsCount}</strong></span>
                  <span>Active Incidents: <strong className="text-coral-600">1 (Resolved)</strong></span>
                  <span>Root Cause: <strong className="text-stone-800">cgroup v2 memory accounting failure</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline and Verdict Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-warm-200 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-stone-400" />
                  <span>Deployment & Incident Chronology</span>
                </h3>
                <span className="text-xs text-stone-400 font-mono">2026-03-24</span>
              </div>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-warm-200">
                {report.timeline?.map((event: any, idx: number) => {
                  const isSpike = event.type === 'INCIDENT' || event.type === 'SUBMISSION_SPIKE';
                  const isRollback = event.type === 'ROLLBACK';
                  return (
                    <div key={idx} className="relative">
                      <div
                        className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                          isSpike ? 'border-rose-500' : isRollback ? 'border-emerald-500' : 'border-lavender-500'
                        }`}
                      />
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-stone-900">{event.event}</span>
                        <span className="text-[11px] font-mono text-stone-400">{event.timestamp?.split('T')[1]}</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">{event.details}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verdict Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-stone-400" />
                  <span>Verdict Distribution</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(report.verdictDistribution || {}).map(([verdict, count]: any) => (
                    <div key={verdict} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-stone-600">{verdict}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{count}</span>
                        <div className="w-16 h-2 bg-warm-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              verdict === 'ACCEPTED'
                                ? 'bg-emerald-500'
                                : verdict === 'JUDGE_ERROR'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(count * 25, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-warm-100 text-[11px] text-stone-400 leading-normal">
                Notice the anomalous spike of <span className="font-semibold text-rose-600">JUDGE_ERROR</span> coinciding directly with deployment v1.4.2.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GraphRAG Section: Cross-Learner Prerequisite Gaps */}
      <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Multi-Hop GraphRAG: Shared Prerequisite Gaps</h3>
              <p className="text-xs text-stone-500">Traverses student submissions, failure patterns, problem concepts, and foundational prerequisites</p>
            </div>
          </div>
          <button
            onClick={handleRunGraphRAG}
            disabled={graphLoading}
            className="px-4 py-2 bg-lavender-50 hover:bg-lavender-100 text-lavender-700 border border-lavender-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{graphLoading ? 'Querying Knowledge Graph...' : 'Execute Multi-Hop Discovery'}</span>
          </button>
        </div>

        <div className="bg-warm-50/50 p-4 rounded-xl border border-warm-200">
          <div className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">Discovered Relationship Pattern</div>
          <p className="text-xs text-stone-700 leading-relaxed font-mono">
            (Learner: <strong>Ronak</strong>) -[:FAILED {`{IndexError}`}]-&gt; (Problem: <strong>Binary Search</strong>) -[:TEACHES]-&gt; (Concept: <strong>Monotonicity</strong>) -[:REQUIRES]-&gt; (<strong>Discrete Boundary Conditions</strong>)
            <br />
            (Learner: <strong>Priya</strong>) -[:FAILED {`{Infinite Loop TLE}`}]-&gt; (Problem: <strong>Rotated Array Min</strong>) -[:TEACHES]-&gt; (Concept: <strong>Binary Search</strong>) -[:REQUIRES]-&gt; (<strong>Discrete Boundary Conditions</strong>)
          </p>
          <div className="mt-3 p-3 bg-white rounded-lg border border-warm-200 text-xs text-stone-600">
            <strong>Pedagogical Insight:</strong> Even though Ronak encountered an out-of-bounds error and Priya experienced an infinite loop, both failures stem from an unformulated loop invariant on discrete intervals. Remediating <em>&quot;Discrete Boundary Conditions &amp; Invariants&quot;</em> cures both failure modes simultaneously.
          </div>
        </div>
      </div>
    </div>
  );
};
