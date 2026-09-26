const CONTEST_API_URL = process.env.NEXT_PUBLIC_CONTEST_API_URL || 'http://localhost:4000';
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('shodha_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(usernameOrEmail: string, password: string) {
    const res = await fetch(`${CONTEST_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('shodha_token', data.accessToken);
      localStorage.setItem('shodha_user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(body: { username: string; displayName: string; email: string; password: string; role?: string }) {
    const res = await fetch(`${CONTEST_API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Registration failed');
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('shodha_token', data.accessToken);
      localStorage.setItem('shodha_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getMe() {
    const res = await fetch(`${CONTEST_API_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return null;
    return res.json();
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shodha_token');
      localStorage.removeItem('shodha_user');
    }
  },

  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('shodha_user');
    return raw ? JSON.parse(raw) : null;
  },

  // Contests
  async getContests() {
    const res = await fetch(`${CONTEST_API_URL}/contests`);
    return res.json();
  },

  async getContest(id: string) {
    const res = await fetch(`${CONTEST_API_URL}/contests/${id}`);
    return res.json();
  },

  async joinContest(id: string) {
    const res = await fetch(`${CONTEST_API_URL}/contests/${id}/join`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getContestProblems(contestId: string) {
    const res = await fetch(`${CONTEST_API_URL}/contests/${contestId}/problems`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  // Problems
  async getProblems() {
    const res = await fetch(`${CONTEST_API_URL}/problems`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getProblem(id: string) {
    const res = await fetch(`${CONTEST_API_URL}/problems/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  // Submissions
  async submitCode(problemId: string, sourceCode: string, language: string = 'python', contestId?: string) {
    const res = await fetch(`${CONTEST_API_URL}/submissions`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemId, sourceCode, language, contestId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Submission failed');
    }
    return res.json();
  },

  async getSubmission(id: string) {
    const res = await fetch(`${CONTEST_API_URL}/submissions/${id}`, {
      headers: { ...getAuthHeader() },
    });
    if (res.status === 403) {
      throw new Error('403 Forbidden: You do not have permission to view another student\'s private submission.');
    }
    return res.json();
  },

  async getMySubmissions(limit: number = 50, offset: number = 0) {
    const res = await fetch(`${CONTEST_API_URL}/users/me/submissions?limit=${limit}&offset=${offset}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  // Leaderboard
  async getLeaderboard(contestId: string, limit: number = 50, offset: number = 0) {
    const res = await fetch(`${CONTEST_API_URL}/contests/${contestId}/leaderboard?limit=${limit}&offset=${offset}`);
    return res.json();
  },

  // Analytics
  async getContestAnalytics(contestId: string) {
    const res = await fetch(`${CONTEST_API_URL}/analytics/contest/${contestId}`);
    return res.json();
  },

  // AI Assistant
  async askAI(question: string, params: { contestId?: string; problemId?: string; submissionId?: string }) {
    const user = this.getCurrentUser() || { id: 'usr-learner-01', role: 'learner' };
    const res = await fetch(`${AI_API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        contestId: params.contestId,
        problemId: params.problemId,
        submissionId: params.submissionId,
        userId: user.id,
        userRole: user.role || 'learner',
      }),
    });
    return res.json();
  },

  async investigateAI(contestId: string, query: string) {
    const res = await fetch(`${AI_API_URL}/ai/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestId, query }),
    });
    return res.json();
  },

  async evaluateComparison() {
    const res = await fetch(`${AI_API_URL}/ai/evaluate-comparison`, {
      method: 'POST',
    });
    return res.json();
  },
};
