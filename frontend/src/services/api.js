const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  let body;
  try { body = await res.json(); } catch { body = null; }

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth:expired'));
  }

  if (!res.ok) {
    const message = body?.error || body?.errors?.map((e) => e.message).join(', ') || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.errors = body?.errors || null;
    throw err;
  }

  return body;
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchClaims(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, v);
  });
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/claims${query}`);
}

export function fetchClaim(id) {
  return request(`/claims/${id}`);
}

export function createClaim(data) {
  return request('/claims', { method: 'POST', body: JSON.stringify(data) });
}

export function updateClaimStatus(id, status) {
  return request(`/claims/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function fetchPolicies() {
  return request('/policies');
}
