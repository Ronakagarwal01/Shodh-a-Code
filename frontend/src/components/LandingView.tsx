'use client';

import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Trophy, Network, Code2, CheckCircle2, Cpu } from 'lucide-react';

interface LandingViewProps {
  onNavigate: (tab: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="text-center pt-10 pb-6 max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lavender-50 border border-lavender-200/80 text-xs font-semibold text-lavender-700 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Shodh-a-Code • AI Engineer Intern Take-Home Project</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight sm:leading-tight">
          Evidence-Grounded AI Coding Contests &amp; Investigation Platform
        </h1>
        <p className="mt-5 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          A full-stack competitive programming platform combining isolated Docker code execution,
          multi-hop GraphRAG curriculum reasoning, and zero-hallucination AI diagnosis.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('contests')}
            className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold shadow-card transition flex items-center gap-2"
          >
            <span>Enter Spring 2026 Contest</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('ai-assistant')}
            className="px-6 py-3 bg-white hover:bg-warm-100 text-stone-800 border border-warm-200 rounded-xl text-sm font-semibold shadow-subtle transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-lavender-600" />
            <span>AI Learning Assistant</span>
          </button>
          <button
            onClick={() => onNavigate('instructor')}
            className="px-6 py-3 bg-lavender-50 hover:bg-lavender-100 text-lavender-700 border border-lavender-200 rounded-xl text-sm font-semibold transition flex items-center gap-2"
          >
            <Network className="w-4 h-4" />
            <span>Instructor Investigation Lab</span>
          </button>
        </div>
      </section>

      {/* 4 Pillars of Architecture */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-lavender-100 border border-lavender-200 flex items-center justify-center text-lavender-700 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Isolated Docker Sandbox</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Deterministic code evaluation inside network-disabled, resource-capped unprivileged Docker containers with ephemeral workspace cleanup.
            </p>
          </div>
          <div className="mt-4 text-[11px] font-mono text-lavender-600 font-semibold">
            --network none • 256MB RAM
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Multi-Hop GraphRAG</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Traverses learner failure patterns across problems to discover shared foundational prerequisite gaps that simple vector similarity misses.
            </p>
          </div>
          <div className="mt-4 text-[11px] font-mono text-teal-600 font-semibold">
            Neo4j Cypher Traversal
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-600 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Strict Privacy &amp; Hints</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Enforced at both API and prompt layers: Hidden test cases and peer private source code are never revealed under any query.
            </p>
          </div>
          <div className="mt-4 text-[11px] font-mono text-coral-600 font-semibold">
            RBAC + Bounded Read Tools
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-warm-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Inspectable Grounding</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Formal distinction between stored Observations, Hypotheses, and Unknowns. Every substantive AI claim references stored evidence.
            </p>
          </div>
          <div className="mt-4 text-[11px] font-mono text-amber-700 font-semibold">
            Zero Hallucination
          </div>
        </div>
      </section>

      {/* Featured Contest Banner */}
      <section className="bg-gradient-to-r from-warm-100 via-white to-lavender-50 p-8 rounded-2xl border border-warm-200 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Contest Live Now</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Spring 2026 Algorithmic Championship</h2>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            5 curated problems covering Two Sum, Binary Search, Rotated Arrays, Graph Cycle Detection, and DP Coin Change.
          </p>
        </div>
        <button
          onClick={() => onNavigate('contests')}
          className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold shadow-sm transition whitespace-nowrap"
        >
          View Problems &amp; Leaderboard
        </button>
      </section>
    </div>
  );
};
