import { Router } from "express";

const router = Router();

// Simple cache to avoid hammering the site
const cache = new Map<string, { ts: number; data: any }>();
const TTL = 60 * 60 * 1000; // 1 hour

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => ({ "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" } as any)[m] || " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && now - hit.ts < TTL) return hit.data as string;
    const r = await fetch(url as any, { headers: { Accept: "text/html" } } as any);
    if (!r.ok) return null;
    const html = await r.text();
    const text = stripHtml(html).slice(0, 200000);
    cache.set(url, { ts: now, data: text });
    return text;
  } catch {
    return null;
  }
}

function extractItems(text: string) {
  const lines = text.split(/(?<=\.)\s+/).slice(0, 4000);
  const datePat = /(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{1,2}\s+(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{4}\b)/i;
  const keywords = /(due date|last date|deadline|important|notification|circular|press release|update|ITR|TDS|advance tax|self-assessment)/i;
  const picks: string[] = [];
  for (const l of lines) {
    if (keywords.test(l) || datePat.test(l)) picks.push(l.trim());
    if (picks.length >= 60) break;
  }
  return picks;
}

router.get("/", async (req, res) => {
  const sources = [
    "https://incometaxindia.gov.in?utm_source=chatgpt.com",
  ];
  const out: { source: string; items: string[] }[] = [];
  for (const u of sources) {
    const text = await fetchPage(u);
    if (text) out.push({ source: u, items: extractItems(text) });
  }
  res.json({ updatedAt: new Date().toISOString(), sources: out });
});

export default router;
