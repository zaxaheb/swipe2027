// Accès Supabase côté serveur (clé service, jamais exposée au navigateur), via l'API REST.
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Compatible avec les nouvelles clés (sb_secret_…, à mettre seulement dans « apikey ») et les anciennes (service_role, JWT).
const H = () => (String(KEY).startsWith("sb_")
  ? { apikey: KEY, "Content-Type": "application/json" }
  : { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });

export async function rpc(fn, args) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H(), body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status} ${await r.text()}`);
  return r.json();
}
export async function select(table, query) {
  const r = await fetch(`${URL_}/rest/v1/${table}?${query}`, { headers: H() });
  if (!r.ok) throw new Error(`select ${table}: ${r.status}`);
  return r.json();
}
export async function upsert(table, row) {
  const r = await fetch(`${URL_}/rest/v1/${table}`, { method: "POST", headers: { ...H(), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(row) });
  if (!r.ok) throw new Error(`upsert ${table}: ${r.status} ${await r.text()}`);
}
export async function insert(table, row) {
  const r = await fetch(`${URL_}/rest/v1/${table}`, { method: "POST", headers: { ...H(), Prefer: "return=minimal" }, body: JSON.stringify(row) });
  if (!r.ok) throw new Error(`insert ${table}: ${r.status} ${await r.text()}`);
}
export async function del(table, query) {
  const r = await fetch(`${URL_}/rest/v1/${table}?${query}`, { method: "DELETE", headers: H() });
  if (!r.ok) throw new Error(`delete ${table}: ${r.status}`);
}
/** Vérifie le jeton d'un utilisateur connecté et renvoie son id (ou null). */
export async function userFromToken(token) {
  if (!token) return null;
  const r = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json(); return u && u.id ? u : null;
}
/** Supprime définitivement un utilisateur (API d'administration Auth). */
export async function deleteUser(id) {
  const r = await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: H() });
  if (!r.ok) throw new Error(`deleteUser: ${r.status} ${await r.text()}`);
}
export async function patch(table, query, values) {
  const r = await fetch(`${URL_}/rest/v1/${table}?${query}`, { method: "PATCH", headers: { ...H(), Prefer: "return=minimal" }, body: JSON.stringify(values) });
  if (!r.ok) throw new Error(`patch ${table}: ${r.status}`);
}
