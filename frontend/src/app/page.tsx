'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { LandingView } from '../components/LandingView';
import { ContestsView } from '../components/ContestsView';
import { CodeEditorView } from '../components/CodeEditorView';
import { LeaderboardView } from '../components/LeaderboardView';
import { LearnerAIAssistant } from '../components/LearnerAIAssistant';
import { InstructorInvestigationView } from '../components/InstructorInvestigationView';
import { SubmissionsView } from '../components/SubmissionsView';
import { EvidenceExplorerView } from '../components/EvidenceExplorerView';
import { AuthModal } from '../components/AuthModal';
import { api } from '../lib/api';
import { Trophy, Code2, Sparkles, BookOpen, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('landing');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Active contest / problem selection
  const [selectedContestId, setSelectedContestId] = useState('contest-spring-2026');
  const [selectedProblemId, setSelectedProblemId] = useState('prob-binary-search');

  useEffect(() => {
    // Restore session
    const u = api.getCurrentUser();
    if (u) {
      setCurrentUser(u);
    } else {
      // Default to Ronak (Learner) for seamless instant demo inspection
      setCurrentUser({
        id: 'usr-learner-01',
        username: 'ronak',
        displayName: 'Ronak Agarwal',
        email: 'ronak@shodha.ai',
        role: 'learner',
        organization: 'Shodh Academy',
      });
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleSelectProblem = (problemId: string, contestId: string) => {
    setSelectedProblemId(problemId);
    setSelectedContestId(contestId);
    setCurrentTab('editor');
  };

  const handleViewLeaderboard = (contestId: string) => {
    setSelectedContestId(contestId);
    setCurrentTab('leaderboard');
  };

  const handleDiagnoseSubmission = (subId: string, probId: string) => {
    setSelectedProblemId(probId);
    setCurrentTab('ai-assistant');
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-50/40">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'landing' && <LandingView onNavigate={(tab) => setCurrentTab(tab)} />}

        {currentTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Welcome back</span>
                <h1 className="text-2xl font-bold text-stone-900 mt-0.5">{currentUser?.displayName || 'Learner'}</h1>
                <p className="text-xs text-stone-500 mt-1">
                  Track your contest progress, review algorithm invariants, and inspect AI curriculum guidance.
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('contests')}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <span>Active Contests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-warm-200 shadow-card">
                <span className="text-xs text-stone-400 font-medium">Contest Rank</span>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">#2</div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">Top 5% of participants</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-warm-200 shadow-card">
                <span className="text-xs text-stone-400 font-medium">Problems Solved</span>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">1 / 5</div>
                <span className="text-[11px] text-stone-500 mt-1 inline-block">Spring 2026 Contest</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-warm-200 shadow-card">
                <span className="text-xs text-stone-400 font-medium">Weak Concept Identified</span>
                <div className="text-sm font-bold text-stone-800 mt-1">Boundary Conditions</div>
                <span className="text-[11px] text-coral-600 font-semibold mt-1 inline-block">Prerequisite gap detected</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-warm-200 shadow-card">
                <span className="text-xs text-stone-400 font-medium">AI Grounded Status</span>
                <div className="text-sm font-bold text-emerald-700 mt-1">High Confidence</div>
                <span className="text-[11px] text-stone-500 mt-1 inline-block">GraphRAG synchronized</span>
              </div>
            </div>

            {/* AI Assistant docked preview */}
            <LearnerAIAssistant
              currentProblemId={selectedProblemId}
              contestId={selectedContestId}
            />
          </div>
        )}

        {currentTab === 'contests' && (
          <ContestsView
            onSelectProblem={handleSelectProblem}
            onViewLeaderboard={handleViewLeaderboard}
          />
        )}

        {currentTab === 'problems' && (
          <ContestsView
            onSelectProblem={handleSelectProblem}
            onViewLeaderboard={handleViewLeaderboard}
          />
        )}

        {currentTab === 'editor' && (
          <CodeEditorView
            problemId={selectedProblemId}
            contestId={selectedContestId}
            onBack={() => setCurrentTab('contests')}
          />
        )}

        {currentTab === 'submissions' && (
          <SubmissionsView onOpenAIForSubmission={handleDiagnoseSubmission} />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardView contestId={selectedContestId} />
        )}

        {currentTab === 'ai-assistant' && (
          <div className="space-y-6">
            <LearnerAIAssistant
              currentProblemId={selectedProblemId}
              contestId={selectedContestId}
            />
          </div>
        )}

        {currentTab === 'instructor' && <InstructorInvestigationView />}

        {currentTab === 'evidence' && <EvidenceExplorerView />}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => setCurrentUser(u)}
      />

      {/* Footer */}
      <footer className="border-t border-warm-200 bg-white py-6 mt-12 text-center text-xs text-stone-400 font-normal">
        Shodh-a-Code • AI Engineer Intern Build • Strict Grounding • Isolated Sandbox • Neo4j GraphRAG
      </footer>
    </div>
  );
}
