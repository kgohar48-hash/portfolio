const BASE = import.meta.env.VITE_API_BASE || "";
const TOKEN_KEY = "pf_admin_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function req(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}/api/admin${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setToken(null);
    const err = new Error(data.error || "Unauthorized");
    err.code = 401;
    throw err;
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const adminApi = {
  login: (password) => req("/login", { method: "POST", body: { password }, auth: false }),
  me: () => req("/me"),
  overview: (params) => req(`/overview?${new URLSearchParams(params)}`),
  sessions: (params) => req(`/sessions?${new URLSearchParams(params)}`),
  session: (id) => req(`/sessions/${encodeURIComponent(id)}`),
  visitors: (params) => req(`/visitors?${new URLSearchParams(params)}`),
  visitor: (id) => req(`/visitors/${encodeURIComponent(id)}`),
  exportSessionsCsv: async (params) => {
    const t = getToken();
    const res = await fetch(`${BASE}/api/admin/export/sessions.csv?${new URLSearchParams(params)}`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {}
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },

  jobs: {
    schema: () => req("/jobs/schema"),
    list: () => req("/jobs"),
    get: (id) => req(`/jobs/${encodeURIComponent(id)}`),
    save: (body) => req("/jobs", { method: "POST", body }),
    patch: (id, body) => req(`/jobs/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    remove: (id) => req(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" })
  },

  mail: {
    list: (params) => req(`/mail?${new URLSearchParams(params)}`),
    get: (id) => req(`/mail/${encodeURIComponent(id)}`),
    apply: (id, body) => req(`/mail/${encodeURIComponent(id)}/apply`, { method: "POST", body }),
    match: (id, applicationId) => req(`/mail/${encodeURIComponent(id)}/match`, { method: "POST", body: { applicationId } }),
    dismiss: (id) => req(`/mail/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),
    reprocess: (id) => req(`/mail/${encodeURIComponent(id)}/reprocess`, { method: "POST" }),
    draft: (id) => req(`/mail/${encodeURIComponent(id)}/draft`, { method: "POST" }),
    reply: (id, body) => req(`/mail/${encodeURIComponent(id)}/reply`, { method: "POST", body }),
    settings: () => req("/mail/settings"),
    saveSettings: (body) => req("/mail/settings", { method: "PATCH", body })
  }
};
