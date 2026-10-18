# Gemini-Prompt: JiMesh-Dashboard de.json vervollständigen (1184 Keys)

## An Gemini (8 Batches à ~150 Keys — Datei `/tmp/de-needs-translation.json`)

Pro Batch diesen Prompt verwenden, JSON-Block ersetzen:

---

Du bist ein professioneller DE→EN-Lokalisierer für eine Entwickler-Admin-Console
(JiMesh: LLM-Gateway + Security-Plattform). Übersetze die folgenden
UI-Strings von Englisch nach Deutsch.

REGELN:
1. **Technische Begriffe bleiben Englisch**, wo das UI-Konvention ist:
   Workspace, App, Deploy/Deployment, Router, Proxy, Model, Provider, API-Key,
   Token, Secret, Vault, Firewall, WAF, SIEM, Endpoint, SSE, Subagent,
   Control-Plane, SDK, Log(s), Dashboard, Fallback, PreAuth-Key, Tailnet,
   Scan, Quarantine (Quarantäne ist ok), Freeze/Release.
2. **Kurze UI-Labels bleiben knapp** (Buttons ≤ 2-3 Wörter: „Speichern",
   „Löschen", „Deployen").
3. **Fachlich korrekt, nicht wörtlich:** „Fallback" im Kontext = Modell-Fallback;
   „spend" = Verbrauch; „budget" = Budget; „guard" = Wächter/Guard (behalte
   „Guard" wenn Teil von Feature-Namen wie „Llama Guard").
4. **Sie-Form** (Admin-Console, professionell).
5. **Kein Markdown im Output, keine Erklärungen** — nur das JSON.

INPUT (JSON-Array mit {key, en}):
[<<<JSON-BLOCK HIER>>>]

OUTPUT: Reines JSON-Array mit {key, de} — exakt dieselben key-Felder,
de = die deutsche Übersetzung. Kein weiterer Text.

---

## Danach: Merge-Skript (lokal ausführen)

```bash
node -e '
const fs = require("fs");
const de = JSON.parse(fs.readFileSync("src/i18n/locales/de.json","utf8"));
const in1 = JSON.parse(fs.readFileSync("de-translated.json","utf8"));
const en = JSON.parse(fs.readFileSync("src/i18n/locales/en.json","utf8"));
const flat = (o,p="") => Object.entries(o).flatMap(([k,v]) => typeof v==="object"&&v?flat(v,p+k+"."):[[p+k,v]]);
const unflat = arr => { const out={}; for (const {key,de:v} of arr){ let c=out; const seg=key.split("."); seg.forEach((s,i)=>{ if(i===seg.length-1) c[s]=v; else { c[s]=c[s]||{}; c=c[s]; } }); } return out; };
const patch = unflat(in1);
const merge = (a,b)=>{ for(const k in b){ if(typeof b[k]==="object"&&b[k]&&typeof a[k]==="object") merge(a[k],b[k]); else a[k]=b[k]; } return a; };
merge(de, patch);
fs.writeFileSync("src/i18n/locales/de.json", JSON.stringify(de,null,2)+"\n");
console.log("gemerged:", in1.length, "Keys");
'
node scripts/check-i18n.mjs
```

## Abschließend

- `npx vitest run` (i18n-Parität muss grün bleiben)
- Commit: `feat(i18n): de.json vervollständigt — 1184 Fallback-Keys übersetzt (Gemini-Batch, Review-merge), en↔de-Switch jetzt ehrlich`
- Danach Prioritäts-Locales gleicher Workflow: es, fr, zh-CN, ru (jeweils
  ~1100-1150 Keys zu übersetzen — gleiche Extraktion mit `locale` statt `de`)
