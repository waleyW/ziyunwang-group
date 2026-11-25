/* Shared by every page of T-Cat's Journey: data, the three fields, and a tiny 3D kit for canvas drawings. */
const ORCID = "0000-0002-2817-8367";
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "#2b3550";
const AI_RE = /machine.learn|neural.net|graph.neural|deep.learn|\bGPT\b|\bLLM|large.language|generative|artificial.intelligence|\bAI\b|active.learn|data.driven|high.throughput|mixture.of.experts|pareto|bayesian|transformer|\bagent|descriptor|autonomous/i;
const SHORT_J = { "Journal of the American Chemical Society": "J. Am. Chem. Soc.", "Angewandte Chemie International Edition": "Angew. Chem. Int. Ed." };

// Three fields. Machine learning is found from the title; Experiment only for DOIs listed as "exp" in data/categories.json;
// everything else (including our co-first and co-second author collaborations) is DFT computation. Hue order validated for CVD.
const TOPICS = [
  { key: "ml", name: "Machine learning", color: "#D9773F", blurb: "Graph neural networks, generative models and language-model agents that learn chemistry from data." },
  { key: "dft", name: "DFT computation", color: "#3E8EE8", blurb: "First-principles calculations of surfaces, reaction paths and transition states." },
  { key: "exp", name: "Experiment", color: "#2FA57E", blurb: "Our own electrochemistry and plasma experiments." }
];
// Secondary tag only: what the paper is about. Hand-checked per DOI in data/tags.json (tools/tag_papers.py); these rules only cover papers newer than that file.
const REACTIONS = [
  { name: "PFAS & carbon capture", re: /PFAS|perfluoro|polyfluoro|amine.CO2/i },
  { name: "Batteries", re: /batter|Zn metal anode|Zn.ion|zinc.air|lithium|sodium.ion|solid electrolyte/i },
  { name: "Nitrogen & urea", re: /nitrogen (electro)?reduction|nitrate|nitrite|ammonia|urea|C[–-]N coupling|N ?2|N₂|NOx|amination/i },
  { name: "Thermal catalysis", re: /CO oxidation|oxidation of methane|dry reforming|Fischer|water.gas shift|zeolite/i },
  { name: "Water, O₂ & H₂", re: /oxygen.evolution|oxygen.reduction|water oxidation|water splitting|seawater|hydrogen evolution|hydrogen oxidation|(OER|HER|HOR|ORR)|water electroly|hydrogen peroxide|H2O2|H₂O₂|fuel cell/i },
  { name: "CO₂ & CO reduction", re: /CO ?2|CO₂|carbon dioxide|CO-to|CO electro|CO reduction|carbon monoxide|ethylene|acetate|ethanol|propanol|formate|formic|methanation|multi.?carbon|C[–-]C coupling|syngas|carbamate/i },
  { name: "Chemical synthesis", re: /hydrogenation|alcohol|aldehyde|chlorination|furfural|C[–-]H|hydrazine|methanol|glycine/i },
  { name: "Theory & methods", re: /descriptor|volcano|optimization framework|explicit solvent|transition state/i }
];
let TAGS = {};
let OVERRIDE = {};
const reactionOf = p => { const d = (p.doi || "").toLowerCase(); return d in TAGS ? TAGS[d] : (REACTIONS.find(r => r.re.test(p.t)) || {}).name || ""; };
const topicOf = p => { const k = OVERRIDE[(p.doi || "").toLowerCase()], i = k ? TOPICS.findIndex(t => t.key === k) : -1; if (i >= 0) return i; return AI_RE.test(p.t) ? 0 : 1; };
const isAI = p => topicOf(p) === 0;
const ROLE_ONE = { "Postdoctoral fellows": "Postdoctoral fellow", "PhD students": "PhD student", "Master's students": "Master’s student", "Visitors": "Visiting researcher", "Alumni": "Alumni" };
const roleOne = r => ROLE_ONE[r] || r;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = n => n.toLocaleString("en-NZ");
const jname = j => SHORT_J[j] || (j && j === j.toUpperCase() ? j.toLowerCase().replace(/([a-z])/g, m => m.toUpperCase()).replace(/(Of|And|The|In|For)/g, m => m.toLowerCase()) : j);
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
const slug = n => n.replace(/^(Assoc\. Prof\.|Prof\.|Dr\.)\s*/, "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- data: category overrides, then the snapshot, then OpenAlex live ---------- */
function fromOpenAlex(author, works) {
  const norm = t => t.toLowerCase().replace(/[^a-z0-9]/g, ""), seen = new Map();
  for (const w of works) {
    if (!["article", "review", "letter"].includes(w.type) || !w.title || /^(correction|author correction|erratum|retraction)/i.test(w.title)) continue;
    const rec = { t: w.title.replace(/<[^>]+>/g, "").trim(), d: w.publication_date || "", y: w.publication_year, j: w.primary_location?.source?.display_name || "",
      doi: (w.doi || "").replace("https://doi.org/", ""), c: w.cited_by_count || 0, a: (w.authorships || []).map(a => a.author.display_name), k: w.topics?.[0]?.display_name || "" };
    const key = norm(rec.t), prev = seen.get(key);
    if (!prev || (rec.j.includes("International") && !prev.j.includes("International"))) { if (prev) rec.c = Math.max(rec.c, prev.c); seen.set(key, rec); }
    else prev.c = Math.max(prev.c, rec.c);
  }
  const pubs = [...seen.values()].sort((a, b) => b.d.localeCompare(a.d));
  return { synced: new Date().toISOString().slice(0, 10), live: true, stats: { works: pubs.length, citations: author.cited_by_count, h: author.summary_stats.h_index }, pubs };
}
async function fetchLive() {
  const ctl = new AbortController(); setTimeout(() => ctl.abort(), 10000);
  const get = u => fetch(u, { signal: ctl.signal }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const sel = "doi,title,publication_date,publication_year,type,primary_location,authorships,cited_by_count,topics";
  const author = await get(`https://api.openalex.org/authors/orcid:${ORCID}`);
  let works = [], page = 1;
  for (;;) { const r = await get(`https://api.openalex.org/works?filter=author.orcid:${ORCID}&sort=publication_date:desc&per-page=200&page=${page}&select=${sel}`); works = works.concat(r.results); if (works.length >= r.meta.count || !r.results.length) break; page++; }
  return fromOpenAlex(author, works);
}
/** Calls onData once with the snapshot and again if the live OpenAlex fetch succeeds. */
function loadPapers(onData) {
  let got = false;
  const cats = fetch("data/categories.json").then(r => r.json())
    .then(d => { OVERRIDE = Object.fromEntries(Object.entries(d.overrides || {}).map(([k, v]) => [k.toLowerCase(), v])); }).catch(() => {})
    .then(() => fetch("data/tags.json")).then(r => r.json()).then(d => { TAGS = d.tags || {}; }).catch(() => {});
  cats.then(() => fetch("data/publications.json")).then(r => r.json()).then(d => { if (!got) onData(d); }).catch(() => {});
  cats.then(fetchLive).then(d => { got = true; onData(d); }).catch(() => {});
}
// visitors and alumni have pages but no seat (or cartoon) on the planet
const onPlanet = p => p.role !== "Visitors" && p.role !== "Alumni";
const loadPeople = () => fetch("data/people.json").then(r => r.json()).then(d => d.people.filter(onPlanet)).catch(() => []);

/* ---------- tiny 3D kit for canvas drawings ---------- */
function project(x, y, z, c) {
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const X = x * cy - z * sy, Z0 = x * sy + z * cy, Y = y * cp - Z0 * sp, Z = y * sp + Z0 * cp, f = c.d / (c.d + Z);
  return { x: c.cx + X * f * c.s, y: c.cy - Y * f * c.s, f, z: Z };
}
function ball(color) {
  const c = document.createElement("canvas"), S = 72, h = S / 2; c.width = c.height = S;
  const g = c.getContext("2d");
  g.fillStyle = color; g.beginPath(); g.arc(h, h, h - 1, 0, 7); g.fill();
  let r = g.createRadialGradient(h * .68, h * .6, 1, h * .68, h * .6, h * .95);
  r.addColorStop(0, "rgba(255,250,235,.85)"); r.addColorStop(.3, "rgba(255,250,235,.15)"); r.addColorStop(1, "rgba(255,250,235,0)");
  g.fillStyle = r; g.beginPath(); g.arc(h, h, h - 1, 0, 7); g.fill();
  r = g.createRadialGradient(h, h, h * .5, h, h, h); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(43,53,80,.45)");
  g.fillStyle = r; g.beginPath(); g.arc(h, h, h - 1, 0, 7); g.fill();
  return c;
}
function dragRotate(el, cam) {
  let d = null;
  el.addEventListener("pointerdown", e => { d = { x: e.clientX, y: e.clientY, moved: 0 }; cam.lastDrag = 0; });
  el.addEventListener("pointermove", e => { if (!d || !(e.buttons & 1)) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; d.moved += Math.abs(dx) + Math.abs(dy); d.x = e.clientX; d.y = e.clientY; cam.yaw += dx * .008; cam.pitch = clamp(cam.pitch + dy * .006, -1.2, 1.2); cam.touched = performance.now(); });
  const end = () => { if (d) { cam.lastDrag = d.moved; d = null; } };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("pointerleave", end);
  return () => !!d;
}
function hidpi(cv, ctx) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return [w, h];
}

/* ---------- shared top-bar menus (<details>) close when you pick or click away ---------- */
function wireMenus(people) {
  const list = document.getElementById("peopleMenu");
  if (list && people) list.innerHTML = people.filter(onPlanet).map(p => `<a href="people.html#${p.slug}"><img src="assets/avatars/${p.slug}.png" alt="">${esc(p.name)}</a>`).join("")
    + `<a href="people.html#visitors">Visitors and alumni →</a>`;
  document.addEventListener("click", e => document.querySelectorAll("details.menu[open]").forEach(d => { if (!d.contains(e.target) || e.target.closest("a")) d.open = false; }));
}
// The preview host serves the home page at the root, not as play.html.
let HOME_AT_ROOT = false;
function fixHome() { if (HOME_AT_ROOT) document.querySelectorAll('a[href^="play.html"]').forEach(a => a.setAttribute("href", a.getAttribute("href").replace("play.html", "./"))); }
fetch("play.html", { method: "HEAD" }).then(r => { if (!r.ok) throw 0; }).catch(() => { HOME_AT_ROOT = true; fixHome(); setTimeout(fixHome, 1000); });
