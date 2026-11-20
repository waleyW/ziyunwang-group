"""Pull Ziyun Wang's publications from OpenAlex into data/publications.json.

The page also fetches OpenAlex live in the browser; this snapshot is the fallback.
Run nightly, e.g. from a GitHub Action or cron:
    python build_publications.py
"""
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

ORCID = "0000-0002-2817-8367"
API = "https://api.openalex.org"
HERE = Path(__file__).parent
OUT = HERE / "data" / "publications.json"

KEEP_TYPES = {"article", "review", "letter"}
SKIP_TITLE = re.compile(r"^(correction|author correction|erratum|retraction)", re.I)
# Shared with the page's JS (see AI_RE there): flags AI4S papers.
AI_RE = re.compile(
    r"machine.learn|neural.net|graph.neural|deep.learn|\bGPT\b|\bLLM|large.language|"
    r"generative|artificial.intelligence|\bAI\b|active.learn|data.driven|high.throughput|"
    r"mixture.of.experts|pareto|bayesian|transformer|\bagent|descriptor|autonomous",
    re.I,
)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": f"tcg-website (mailto:ziyun.wang@auckland.ac.nz)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def compact(w):
    src = (w.get("primary_location") or {}).get("source") or {}
    authors = [a["author"]["display_name"] for a in w.get("authorships", [])]
    topic = (w.get("topics") or [{}])[0].get("display_name", "")
    return {
        "t": re.sub(r"<[^>]+>", "", w["title"] or "").strip(),
        "d": w.get("publication_date") or "",
        "y": w.get("publication_year"),
        "j": src.get("display_name") or "",
        "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
        "c": w.get("cited_by_count", 0),
        "a": authors,
        "k": topic,
    }


def norm(t):
    return re.sub(r"[^a-z0-9]", "", t.lower())


def main():
    author = get(f"{API}/authors/orcid:{ORCID}")
    works, page = [], 1
    sel = "doi,title,publication_date,publication_year,type,primary_location,authorships,cited_by_count,topics"
    while True:
        r = get(f"{API}/works?filter=author.orcid:{ORCID}&sort=publication_date:desc&per-page=200&page={page}&select={sel}")
        works += r["results"]
        if len(works) >= r["meta"]["count"] or not r["results"]:
            break
        page += 1

    seen = {}
    for w in works:
        if w.get("type") not in KEEP_TYPES or not w.get("title") or SKIP_TITLE.match(w["title"]):
            continue
        rec = compact(w)
        key = norm(rec["t"])
        prev = seen.get(key)
        # Angewandte publishes every paper twice (German + International Edition); keep the international one.
        if prev is None or ("International" in rec["j"] and "International" not in prev["j"]):
            if prev:
                rec["c"] = max(rec["c"], prev["c"])
            seen[key] = rec
        else:
            prev["c"] = max(prev["c"], rec["c"])
    pubs = sorted(seen.values(), key=lambda p: p["d"], reverse=True)

    data = {
        "synced": date.today().isoformat(),
        "stats": {
            "works": len(pubs),
            "citations": author["cited_by_count"],
            "h": author["summary_stats"]["h_index"],
            "i10": author["summary_stats"]["i10_index"],
        },
        "byYear": {str(c["year"]): c["cited_by_count"] for c in author.get("counts_by_year", [])},
        "pubs": pubs,
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(pubs)} publications, {data['stats']['citations']} citations, h={data['stats']['h']}")


if __name__ == "__main__":
    main()
