const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Get stored token
const getToken = () => localStorage.getItem('auth_token');

// Helper for authenticated requests
const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Only set JSON content-type for string bodies (not FormData)
  if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return res;
};

export const api = {
  // === Auth ===
  async register(name, email, password, password_confirmation) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, email, password, password_confirmation }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return { ok: res.ok, data };
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return { ok: res.ok, data };
  },

  logout() {
    authFetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => { });
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },

  isAuthenticated() {
    return !!getToken();
  },

  // === Projects ===
  async listProjects() {
    const res = await authFetch(`${API_BASE}/projects`);
    return res.json();
  },

  async createProject(sourceUrl, title = null) {
    const res = await authFetch(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify({ source_url: sourceUrl, title }),
    });
    return res.json();
  },

  async createProjectWithFile(file, title = null) {
    const formData = new FormData();
    formData.append('video_file', file);
    if (title) formData.append('title', title);

    const token = getToken();
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (res.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  async getProject(id) {
    const res = await authFetch(`${API_BASE}/projects/${id}`);
    return res.json();
  },

  async checkStatus(id) {
    const res = await authFetch(`${API_BASE}/projects/${id}/status`);
    return res.json();
  },

  async transcriptionStatus(id) {
    const res = await authFetch(`${API_BASE}/projects/${id}/transcription-status`);
    return res.json();
  },

  // === AI ===
  async analyze(id) {
    const res = await authFetch(`${API_BASE}/projects/${id}/analyze`, { method: 'POST' });
    return res.json();
  },

  async chat(id, message) {
    const res = await authFetch(`${API_BASE}/projects/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  // === Clips ===
  async updateClip(projectId, clipId, data) {
    const res = await authFetch(`${API_BASE}/projects/${projectId}/clips/${clipId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteClip(projectId, clipId) {
    const res = await authFetch(`${API_BASE}/projects/${projectId}/clips/${clipId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async refreshBroll(projectId, clipId, keywords) {
    const res = await authFetch(`${API_BASE}/projects/${projectId}/clips/${clipId}/broll`, {
      method: 'POST',
      body: JSON.stringify({ keywords }),
    });
    return res.json();
  },

  // === Render ===
  async render(id) {
    const res = await authFetch(`${API_BASE}/projects/${id}/render`, { method: 'POST' });
    return res.json();
  },
};
