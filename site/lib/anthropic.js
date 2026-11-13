// Appel minimal à l'API Messages d'Anthropic (sans dépendance).
export async function messages(body) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL, ...body })
  });
  if (r.status === 429) { const e = new Error("rate_limited"); e.status = 429; throw e; }
  if (!r.ok) { const e = new Error(`anthropic ${r.status}: ${await r.text()}`); e.status = 502; throw e; }
  return r.json();
}
export const textOf = (d) => (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
