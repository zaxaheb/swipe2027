// GET /api/actus?q=<nom du candidat ou vide>
// → les derniers articles de presse sur la présidentielle (Google Actualités, flux RSS public), mis en cache 30 min.
// On ne renvoie que le titre, le média, la date et le lien : l'article se lit sur le site du média.
const CACHE = new Map();   // par instance : q → { t, items }
const TTL = 30 * 60 * 1000;

const dec = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? dec(m[1]) : ""; };

export default async function handler(req, res) {
  const q = String(req.query.q || "").replace(/[^\p{L}\p{N} '’-]/gu, "").trim().slice(0, 60);
  const query = (q ? `"${q}" ` : "") + "présidentielle 2027";
  const hit = CACHE.get(query);
  if (hit && Date.now() - hit.t < TTL) return send(res, hit.items);
  try {
    const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query + " when:14d") + "&hl=fr&gl=FR&ceid=FR:fr";
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Swipe2027; +https://swipe2027.fr)" } });
    if (!r.ok) throw new Error("rss " + r.status);
    const xml = await r.text();
    const seen = new Set(), items = [];
    for (const it of xml.split("<item>").slice(1)) {
      let t = tag(it, "title"), src = tag(it, "source");
      if (src && t.endsWith(" - " + src)) t = t.slice(0, -(src.length + 3));
      const k = t.toLowerCase().slice(0, 80); if (!t || seen.has(k)) continue; seen.add(k);
      const d = new Date(tag(it, "pubDate"));
      items.push({ t, src, url: tag(it, "link"), d: isNaN(d) ? null : d.toISOString() });
      if (items.length >= 20) break;
    }
    items.sort((a, b) => String(b.d).localeCompare(String(a.d)));
    CACHE.set(query, { t: Date.now(), items });
    send(res, items);
  } catch (e) {
    if (hit) return send(res, hit.items);
    res.status(502).json({ error: "indisponible" });
  }
}
function send(res, items) {
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  res.status(200).json({ items, source: "Google Actualités" });
}
