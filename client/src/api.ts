const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Players
  getPlayers: () => request('/players'),
  createPlayer: (name: string) => request('/players', { method: 'POST', body: JSON.stringify({ name }) }),
  deletePlayer: (id: number) => request(`/players/${id}`, { method: 'DELETE' }),

  // Queue
  getQueue: () => request('/queue'),
  joinQueue: (player_id: number) => request('/queue', { method: 'POST', body: JSON.stringify({ player_id }) }),
  leaveQueue: (player_id: number) => request(`/queue/${player_id}`, { method: 'DELETE' }),
  reorderQueue: (playerIds: number[]) =>
    request('/queue/reorder', { method: 'PATCH', body: JSON.stringify({ playerIds }) }),

  // Tables
  getTables: () => request('/tables'),
  createTable: (name: string) => request('/tables', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteTable: (id: number) => request(`/tables/${id}`, { method: 'DELETE' }),

  // Matches
  getMatches: (status?: string) => request(`/matches${status ? `?status=${status}` : ''}`),
  startMatch: (
    player1_id: number,
    player2_id: number,
    opts?: { table_id?: number; player3_id?: number; player4_id?: number }
  ) =>
    request('/matches/start', {
      method: 'POST',
      body: JSON.stringify({ player1_id, player2_id, ...opts }),
    }),
  updateScore: (id: number, player1_score: number, player2_score: number) =>
    request(`/matches/${id}/score`, { method: 'PATCH', body: JSON.stringify({ player1_score, player2_score }) }),
  completeMatch: (id: number, winner_id: number) =>
    request(`/matches/${id}/complete`, { method: 'POST', body: JSON.stringify({ winner_id }) }),
  voidMatch: (id: number) => request(`/matches/${id}`, { method: 'DELETE' }),

  // Leaderboard
  getLeaderboard: () => request('/leaderboard'),

  // Stats
  getStats: () => request('/stats'),

  // Admin
  resetAll: () => request('/reset', { method: 'POST' }),
};
