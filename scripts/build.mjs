import { readFile, writeFile, mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const dist = join(root, "dist");

const DOCS_DRIFT_NOTE = `
<div class="meta-banner">
  <strong>Generated reference.</strong> The endpoint tables below are kept honest by the
  backend's <code>make openapi-spec</code> pipeline: the Go gateway records its real
  route registry (method probe included) and merges <code>openapi/overlay.yaml</code>
  into an OpenAPI 3.1 document; the markdown tables are generated from the same source.
  Source of truth lives in the JiMesh backend repo (<code>jimesh2</code>). Do not edit
  this HTML by hand — edit the overlay or the backend routes and regenerate.
</div>
`;

const DOC_CSS = `
:root { font-family: ui-sans-serif, system-ui, sans-serif; color-scheme: light dark; }
body { max-width: 980px; margin: 0 auto; padding: 2.5rem 1.25rem 6rem; line-height: 1.65; }
h1, h2, h3 { line-height: 1.25; scroll-margin-top: 1rem; }
h1 { border-bottom: 2px solid #8884; padding-bottom: .35em; }
h2 { border-bottom: 1px solid #8883; padding-bottom: .25em; margin-top: 2.2em; }
h3 { margin-top: 1.8em; }
table { border-collapse: collapse; width: 100%; margin: 1.25em 0; display: block; overflow-x: auto; }
th, td { border: 1px solid #8885; padding: .45em .7em; text-align: left; vertical-align: top; font-size: .925em; }
th { background: #8881; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; background: #8882; padding: .12em .35em; border-radius: 4px; }
pre { background: #8881; padding: 1em .9em; border-radius: 8px; overflow-x: auto; }
pre code { background: transparent; padding: 0; }
blockquote { border-left: 4px solid #8884; margin: 1em 0; padding: .1em 1em; color: inherit; opacity: .85; }
.meta-banner { background: #8882; border: 1px solid #8884; border-radius: 8px; padding: .8em 1em; margin: 1.2em 0 2em; font-size: .925em; }
hr { border: none; border-top: 2px solid #8884; margin: 2.5em 0; }
a { color: #3a7dca; text-decoration: none; }
a:hover { text-decoration: underline; }
`;

const PAGE_CSS = `
:root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: #0b0d11; color: #e7e9ee; min-height: 100vh; }
header { display: flex; align-items: center; gap: 1rem; padding: .7rem 1.25rem; border-bottom: 1px solid #ffffff18; position: sticky; top: 0; background: #0b0d11e6; backdrop-filter: blur(8px); z-index: 10; }
header strong { letter-spacing: .04em; }
nav.tabs { display: flex; gap: .25rem; flex-wrap: wrap; }
nav.tabs a { color: #b8bec9; padding: .35em .8em; border-radius: 999px; text-decoration: none; font-size: .925em; border: 1px solid transparent; }
nav.tabs a:hover { color: #fff; background: #ffffff14; }
nav.tabs a.active { color: #fff; background: #ffffff1f; border-color: #ffffff35; }
header .links { margin-left: auto; display: flex; gap: .9rem; font-size: .9em; }
header .links a { color: #8ab4f8; text-decoration: none; }
header .links a:hover { text-decoration: underline; }
main { display: flex; flex-direction: column; height: calc(100vh - 57px); }
#api-reference, .scalar-loading { flex: 1; min-height: 0; }
.gateway-bar { display: flex; gap: .6rem; align-items: center; padding: .8rem 1.25rem; border-bottom: 1px solid #ffffff18; font-size: .9em; color: #b8bec9; flex-wrap: wrap; }
.gateway-bar input { background: #ffffff0f; border: 1px solid #ffffff2b; color: #e7e9ee; padding: .45em .7em; border-radius: 6px; min-width: 320px; font-size: .95em; }
.gateway-bar button { background: #2f6fed; border: none; color: #fff; padding: .5em 1em; border-radius: 6px; cursor: pointer; font-size: .95em; }
.gateway-bar button:hover { background: #245bd0; }
.scalar-loading { display: grid; place-items: center; color: #b8bec9; padding: 2rem; text-align: center; }
.scalar-loading .hint { max-width: 60ch; line-height: 1.6; font-size: .95em; }
.scalar-loading code { background: #ffffff14; padding: .1em .35em; border-radius: 4px; }
a { color: #8ab4f8; }
`;

const SCALAR_CDN = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";

const SPECS = {
  public: { label: "JiMesh Gateway API (public)", url: "/spec/gateway.public.openapi.json" },
};
// gateway.internal.openapi.json is intentionally NOT bundled: it documents every
// internal control-plane route and must never ship in the public Pages artifact.

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

function slugify(id) {
  return id
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function renderMarkdown(mdPath) {
  const raw = await readFile(mdPath, "utf8");
  const outName = basename(mdPath).replace(/\.md$/, ".html");
  const htmlBody = await marked.parse(raw, { gfm: true, headerIds: true, mangle: false });

  // TOC from h2 headings + anchor ids on h1..h3
  const headings = [];
  let i = 0;
  const withIds = htmlBody.replace(/<h([123])>([\s\S]*?)<\/h\1>/g, (_m, lvl, inner) => {
    let id = "";
    const plain = inner.replace(/<[^>]+>/g, "").trim();
    // marked with headerIds already emitted ids on the <h> tag itself; this fallback
    // only handles headings without an id (headerIds disabled or raw html).
    if (!/\bid=/.test(inner)) {
      id = slugify(plain);
      if (!id) id = "h-" + i++;
    }
    if (lvl === "2" && plain) headings.push({ text: plain, id });
    return `<h${lvl}${markId(inner, id)}>${inner}</h${lvl}>`;
  });

  const toc = headings.length
    ? `<nav class="toc"><h2>Contents</h2><ul>${headings
        .map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`)
        .join("")}</ul></nav>`
    : "";

  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(outName.replace(/\.html$/, ""))} — JiMesh API docs</title>
<style>${DOC_CSS}</style>
</head>
<body>
${DOCS_DRIFT_NOTE}
${toc}
${withIds}
<footer><hr><p><a href="../index.html?spec=public">Open the Scalar API reference</a></p></footer>
</body>
</html>`;

  const outPath = join(dist, "docs", outName);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, doc);
  return outName;
}

function markId(inner, id) {
  if (/\bid=/.test(inner)) return "";
  return ` id="${id}"`;
}

function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(join(dist, "docs"), { recursive: true });

  // 1. copy specs 1:1 (flatten spec/api/*.json -> dist/spec/*.json for site URLs).
  //    Internal specs stay out of the public artifact even if someone drops one in.
  await mkdir(join(dist, "spec"), { recursive: true });
  for (const f of await readdir(join(root, "spec", "api"))) {
    if (!f.endsWith(".json")) continue;
    if (f.includes("internal")) {
      console.log("skipping internal spec:", f);
      continue;
    }
    await copyFile(join(root, "spec", "api", f), join(dist, "spec", f));
  }

  // 2. render markdown -> html
  const mdFiles = (await walk(join(root, "content"))).filter((p) => p.endsWith(".md"));
  for (const f of mdFiles) {
    const name = await renderMarkdown(f);
    console.log("rendered", name);
  }

  // 2b. render docs/*.md -> dist/docs/ (same renderer)
  const curDocs = (await walk(join(root, "docs"))).filter((p) => p.endsWith(".md"));
  for (const f of curDocs) {
    const name = await renderMarkdown(f);
    console.log("rendered docs/", name);
  }

  // 3. index.html from template (scalar loads specs via url — no inline spec JSON)
  const template = await readFile(join(root, "src", "index.html"), "utf8");
  await writeFile(join(dist, "index.html"), template);

  // 4. openapi gateway-url helper page
  await mkdir(join(dist, "openapi"), { recursive: true });
  await writeFile(join(dist, "openapi", "index.html"), buildGatewayUrlHelper());

  // 5. sanity check: no broken internal links (absolute-or-relative internal hrefs must exist in dist)
  const distFiles = new Set((await walk(dist)).map((p) => "/" + relative(dist, p).replace(/\\/g, "/")));
  let broken = 0;
  for (const p of distFiles) {
    if (!p.endsWith(".html")) continue;
    const file = await readFile(join(dist, p), "utf8");
    for (const m of file.matchAll(/(?:href|src|data-url)="([^"#?]*?)"/g)) {
      const raw = m[1].replace(/\/+$/, "");
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw === "") continue; // external / other scheme
      const target = raw.startsWith("/")
        ? raw
        : join("/", dirname(p), raw).replace(/\\/g, "/").replace(/\/+$/, "") || "/";
      const t = target === "/" ? "/" : target;
      const candidates = [t, t + "/", t + "/index.html", t + ".html", t + ".json"];
      if (!candidates.some((c) => distFiles.has(c))) {
        console.error(`BROKEN LINK in ${p}: "${m[1]}" -> ${target}`);
        broken++;
      }
    }
  }
  if (broken) {
    console.error(`build failed: ${broken} broken internal link(s)`);
    process.exit(1);
  }
  console.log(`build ok: ${distFiles.size} files in dist/`);
}

function buildGatewayUrlHelper() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>OpenAPI endpoints — JiMesh docs</title><style>${PAGE_CSS}</style></head>
<body>
<header><strong style="font-size:1.05em">JiMesh</strong><span>API docs</span></header>
<main style="max-width:760px;margin:0 auto;padding:2rem 1.25rem;display:block;height:auto">
<h1>OpenAPI endpoints</h1>
<p>The public API reference is bundled: the Go gateway's route registry is exported by
<code>make openapi-spec</code> into <code>spec/api/gateway.public.openapi.json</code>
(OpenAPI 3.1, try-it enabled — point Scalar's server selector at your gateway).</p>
<ul>
<li><a href="../index.html?spec=public">Public API reference (bundled spec)</a> — <a href="../spec/gateway.public.openapi.json">raw spec</a></li>
<li><a href="../index.html?spec=live">Live gateway reference</a> — fetches <code>GET http://&lt;host&gt;:19091/openapi.json</code> from a running backend (unauthenticated, GET only)</li>
</ul>
<p>The <em>internal</em> control-plane spec
(<code>gateway.internal.openapi.json</code>) is generated next to the public one in
the backend repo but is deliberately not published here.</p>
<h2>Markdown reference</h2>
<ul>
<li><a href="../docs/API_DOCS.html">API_DOCS.html</a></li>
<li><a href="../docs/API_ENDPOINTS.html">API_ENDPOINTS.html</a> — generated endpoint index (method/path/summary per tag)</li>
<li><a href="../docs/overview.html">Overview</a></li>
<li><a href="../docs/getting-started.html">Getting started</a></li>
<li><a href="../docs/architecture.html">Architecture</a></li>
</ul>
</main></body></html>`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
