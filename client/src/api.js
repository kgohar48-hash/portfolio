// In dev, Vite proxies /api -> localhost:5000. In prod the API is same-origin.
// Override with VITE_API_BASE if the API lives elsewhere.
const BASE = import.meta.env.VITE_API_BASE || "";

export async function getPortfolio() {
  const res = await fetch(`${BASE}/api/portfolio`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Portfolio request failed (${res.status})`);
  const body = await res.json();
  return body.data;
}

export async function sendContact(payload) {
  const res = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}
