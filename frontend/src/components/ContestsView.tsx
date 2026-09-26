'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../lib/api';

interface ContestsViewProps {
  onSelectProblem: (problemId: string, contestId: string) => void;
  onViewLeaderboard: (contestId: string) => void;
}

export const ContestsView: React.FC<ContestsViewProps> = ({
  onSelectProblem,
  onViewLeaderboard,
}) => {
  const [contests, setContests] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState<any>(null);

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    try {
      const data = await api.getContests();
      setContests(data || []);
      if (data?.length > 0) {
        selectContest(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectContest = async (contest: any) => {
    setSelectedContest(contest);
    try {
      const pData = await api.getContestProblems(contest.id);
      setProblems(pData || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Trophy className="w-4 h-4 text-lavender-600" />
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Competitive Arena</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Active &amp; Archived Contests</h1>
          <p className="text-xs text-stone-500 mt-1">Participate in live algorithmic challenges or practice with archived rounds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contests List */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-stone-400 px-1">Select Contest</h3>
          {contests.map((c) => {
            const isSelected = selectedContest?.id === c.id;
            const isActive = c.status === 'ACTIVE';
            return (
              <div
                key={c.id}
                onClick={() => selectContest(c)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-lavender-400 shadow-card ring-2 ring-lavender-500/10'
                    : 'bg-white/80 hover:bg-white border-warm-200 shadow-subtle'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">{c.organization}</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900">{c.title}</h4>
                <div className="flex items-center gap-4 mt-3 text-xs text-stone-500 font-mono">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 3h 00m</span>
                  <span>{c.problemIds?.length || 5} Problems</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Contest Overview & Problem Set */}
        <div className="lg:col-span-2 space-y-6">
          {selectedContest && (
            <>
              {/* Contest Banner */}
              <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">{selectedContest.title}</h2>
                  <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">{selectedContest.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewLeaderboard(selectedContest.id)}
                    className="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-stone-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Leaderboard</span>
                  </button>
                </div>
              </div>

              {/* Problems Table */}
              <div className="bg-white rounded-2xl border border-warm-200 shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-stone-700">Contest Problem Set</h3>
                  <span className="text-xs text-stone-400 font-mono">{problems.length} problems total</span>
                </div>
                <div className="divide-y divide-warm-100">
                  {problems.map((p, idx) => (
                    <div
                      key={p.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-warm-50/50 transition cursor-pointer"
                      onClick={() => onSelectProblem(p.id, selectedContest.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-stone-400 w-5 font-mono">{idx + 1}.</span>
                        <div>
                          <div className="font-semibold text-stone-900 text-sm">{p.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                p.difficulty === 'EASY'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : p.difficulty === 'MEDIUM'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {p.difficulty}
                            </span>
                            {p.tags?.map((t: string) => (
                              <span key={t} className="text-[10px] text-stone-500 font-mono bg-warm-100 px-1.5 py-0.2 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-xs font-mono font-bold text-stone-600">{p.points} pts</span>
                        <button className="p-2 text-stone-400 hover:text-stone-700 hover:bg-warm-100 rounded-lg transition">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
