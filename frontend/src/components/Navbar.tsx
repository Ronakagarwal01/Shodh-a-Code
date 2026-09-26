'use client';

import React from 'react';
import { BookOpen, Sparkles, Trophy, Code2, ShieldAlert, BarChart3, User, LogOut, ChevronRight } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: any;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  onOpenAuth,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'contests', label: 'Contests', icon: Trophy },
    { id: 'problems', label: 'Problems', icon: Code2 },
    { id: 'submissions', label: 'Submissions', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, badge: 'Grounded' },
    { id: 'instructor', label: 'Instructor Hub', icon: ShieldAlert, role: 'instructor' },
    { id: 'evidence', label: 'Evidence Explorer', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-warm-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lavender-600 via-lavender-500 to-coral-500 flex items-center justify-center shadow-subtle text-white font-bold text-lg">
              श
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-stone-900">Shodh-a-Code</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-700 border border-lavender-200">
                AI Research & Contest
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              if (item.role === 'instructor' && currentUser?.role !== 'instructor' && currentUser?.role !== 'admin') {
                return null;
              }
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-lavender-50 text-lavender-700 shadow-sm border border-lavender-200/60'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-warm-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-lavender-600' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-lavender-200/80 text-lavender-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Auth State / Profile */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-stone-900">{currentUser.displayName || currentUser.username}</span>
                  <span className="text-xs text-stone-500 capitalize">{currentUser.role} • {currentUser.organization || 'Shodh'}</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-lavender-100 text-lavender-700 font-bold flex items-center justify-center border border-lavender-200 text-sm">
                  {(currentUser.displayName || currentUser.username)[0].toUpperCase()}
                </div>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-2 text-stone-400 hover:text-stone-700 hover:bg-warm-100 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
