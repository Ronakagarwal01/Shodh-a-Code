'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Clock, CheckCircle2, RotateCw } from 'lucide-react';
import { api } from '../lib/api';

interface LeaderboardViewProps {
  contestId?: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  contestId = 'contest-spring-2026',
}) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [contestId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await api.getLeaderboard(contestId);
      setEntries(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs">🥇</span>;
    if (rank === 2) return <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-xs">🥈</span>;
    if (rank === 3) return <span className="w-6 h-6 rounded-full bg-amber-200/60 text-amber-800 font-bold flex items-center justify-center text-xs">🥉</span>;
    return <span className="text-xs font-mono font-bold text-stone-500 pl-2">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Live Standings</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Contest Leaderboard</h1>
          <p className="text-xs text-stone-500 mt-1">Deterministic scoring • Penalties calculated on wrong attempts before accepted verdict</p>
        </div>
        <button
          onClick={loadLeaderboard}
          disabled={loading}
          className="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-stone-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-card overflow-hidden">
        <table className="min-w-full divide-y divide-warm-200">
          <thead className="bg-warm-50/70">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Participant</th>
              <th className="px-6 py-3.5 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Solved</th>
              <th className="px-6 py-3.5 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Total Score</th>
              <th className="px-6 py-3.5 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Penalty Time</th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100 text-sm">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400 text-xs">
                  No submissions recorded yet for this contest.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.userId} className="hover:bg-warm-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">{getRankBadge(entry.rank)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-stone-900">{entry.displayName || entry.username}</span>
                      <span className="text-xs text-stone-400 font-mono">@{entry.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {entry.solvedCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-bold text-stone-900 font-mono">{entry.totalScore}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-stone-500 font-mono">
                    {entry.totalPenaltyMinutes}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-stone-400 font-mono">
                    {entry.lastSubmissionTime ? entry.lastSubmissionTime.split('T')[1]?.substring(0, 8) : '—'}
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
