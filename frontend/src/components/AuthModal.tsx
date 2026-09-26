'use client';

import React, { useState } from 'react';
import { X, User, Lock, Mail, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [role, setRole] = useState('learner');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let data;
      if (isRegister) {
        data = await api.register({
          username,
          displayName: displayName || username,
          email,
          password,
          role,
        });
      } else {
        data = await api.login(username || email, password);
      }
      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string = 'Password123!') => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(u, p);
      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-warm-200 shadow-elevated w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-warm-100 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-900">
            {isRegister ? 'Create Shodh Account' : 'Sign In to Shodh-a-Code'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Access coding contests, deterministic judge results, and AI learning tools.
          </p>
        </div>

        {/* Quick Demo Personas */}
        <div className="mb-5 p-3 rounded-xl bg-lavender-50/60 border border-lavender-200/80">
          <span className="text-[11px] font-bold text-lavender-800 uppercase tracking-wider block mb-2">
            One-Click Demo Personas
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('ronak')}
              className="p-2 bg-white hover:bg-warm-50 border border-warm-200 rounded-lg text-stone-800 text-left font-medium transition"
            >
              Ronak (Learner)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('priya_sharma')}
              className="p-2 bg-white hover:bg-warm-50 border border-warm-200 rounded-lg text-stone-800 text-left font-medium transition"
            >
              Priya (Learner)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('prof_vikram')}
              className="p-2 bg-white hover:bg-warm-50 border border-warm-200 rounded-lg text-stone-800 text-left font-medium transition"
            >
              Prof. Vikram (Instructor)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin_shodha')}
              className="p-2 bg-white hover:bg-warm-50 border border-warm-200 rounded-lg text-stone-800 text-left font-medium transition"
            >
              Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ronak"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-warm-200 focus:outline-none focus:ring-2 focus:ring-lavender-500/20 focus:border-lavender-500"
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ronak Agarwal"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-warm-200 focus:outline-none focus:ring-2 focus:ring-lavender-500/20 focus:border-lavender-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ronak@shodha.ai"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-warm-200 focus:outline-none focus:ring-2 focus:ring-lavender-500/20 focus:border-lavender-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-warm-200 focus:outline-none"
                >
                  <option value="learner">Learner</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-warm-200 focus:outline-none focus:ring-2 focus:ring-lavender-500/20 focus:border-lavender-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-lavender-600 font-semibold hover:underline"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
