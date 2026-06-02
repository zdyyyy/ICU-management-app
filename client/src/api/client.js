async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.message || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  beds: {
    list: () => request('/api/beds'),
    available: (type) =>
      request(`/api/beds/available${type ? `?type=${encodeURIComponent(type)}` : ''}`),
    create: (body) => request('/api/beds', { method: 'POST', body: JSON.stringify(body) }),
    assign: (bedId, patientId) =>
      request(`/api/beds/${bedId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      }),
    release: (bedId) => request(`/api/beds/${bedId}/release`, { method: 'POST' }),
  },
  patients: {
    list: () => request('/api/patients'),
    create: (body) => request('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/patients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  waitlist: {
    list: () => request('/api/waitlist'),
    ranked: () => request('/api/triage/waitlist-ranked'),
    add: (patientId) =>
      request('/api/waitlist/add', { method: 'POST', body: JSON.stringify({ patientId }) }),
    remove: (patientId) =>
      request('/api/waitlist/remove', { method: 'POST', body: JSON.stringify({ patientId }) }),
  },
  triage: {
    priorityLevels: () => request('/api/triage/priority-levels'),
  },
  assistant: {
    ask: (question) =>
      request('/api/assistant/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  },
};
