"use strict";
/*
 * build_auditoria.js — renderiza a auditoria a partir da FONTE tokenizada.
 *
 * docs/auditoria.src.html e' a fonte de verdade editavel (substitui o antigo
 * docs/auditoria.docx, aposentado). Cada numero clinico nela e' um token {{...}}
 * resolvido de canon/policy.json + core/cad_core.js — a mesma fonte unica de que
 * app/tratado/painel/pranchas ja derivam. Assim o documento de auditoria nao pode
 * mais driftar do canon (o furo que a errata pegou 5x quando era .docx a mao).
 *
 * Saidas (build artifacts, nunca editados a mao):
 *   docs/auditoria.html  — documento auto-contido, estilizado (determinístico)
 *   docs/auditoria.pdf   — render do HTML via Chromium (Playwright)
 *
 * Uso:
 *   node scripts/build_auditoria.js            # regenera HTML + PDF
 *   node scripts/build_auditoria.js --check    # CI: sem escrever; barra drift
 *
 * O --check (em `npm run check`/ci) falha se: (a) sobrar token nao resolvido;
 * (b) o HTML commitado divergir do que a fonte+canon produzem agora; (c) um numero
 * canonico sumir ou uma forma obsoleta reaparecer no texto renderizado.
 *
 * PDF nao entra no --check (binario do Chromium nao e' byte-estavel); o artefato
 * gateado e' o HTML, deterministico a partir de fonte+canon.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// playwright pode estar global (sem node_modules local) — mesma resolucao do render_smoke
function loadChromium() {
  try { return require("playwright").chromium; } catch (_) {}
  const g = execSync("npm root -g").toString().trim();
  return require(path.join(g, "playwright")).chromium;
}

const root = path.join(__dirname, "..");
const SRC = path.join(root, "docs/auditoria.src.html");
const OUT_HTML = path.join(root, "docs/auditoria.html");
const OUT_PDF = path.join(root, "docs/auditoria.pdf");

const cad = require("../core/cad_core.js");
const canon = JSON.parse(fs.readFileSync(path.join(root, "canon/policy.json"), "utf8"));

const isCheck = process.argv.includes("--check");
let fails = 0;
const bad = (m) => { console.error("  FAIL " + m); fails++; };

// ---- resolvedor de tokens: valores VEM do canon; display em pt-BR (virgula) ----
const br = (n, d) => Number(n).toFixed(d).replace(".", ",");
const P = canon;
const TOKENS = {
  "dx.glucose": String(P.diagnosis.glucoseMgDl),
  "dx.bhb": br(P.diagnosis.betaHydroxybutyrateMmolL, 1),
  "dx.ketonuria": String(P.diagnosis.ketonuriaCruzesAtLeast),
  "dx.ph": br(P.diagnosis.ph, 2),
  "dx.hco3": String(P.diagnosis.bicarbonateMmolL),
  "k.replace": br(P.potassium.replaceBelowMmolL, 1),
  "k.targetLow": String(P.potassium.targetLowMmolL),
  "k.targetHigh": String(P.potassium.targetHighMmolL),
  "k.hold": br(P.potassium.holdInsulinBelowMmolL, 1),
  "bicarb.consider": br(P.bicarbonate.considerBelowPh, 1),
  "bicarb.noBenefit": br(P.bicarbonate.noBenefitAbovePh, 1),
  "res.bhb": br(P.resolution.betaHydroxybutyrateBelowMmolL, 1),
  "res.ph": br(P.resolution.phAtLeast, 1),
  "res.hco3": String(P.resolution.bicarbonateAtLeastMmolL),
  "res.glucoseAdjunct": String(P.resolution.glucoseAdjunctMgDl),
  "na.factor": br(P.sodiumCorrection.factorDefault, 1),
  "na.factorSevere": br(P.sodiumCorrection.factorSevereHyperglycemia, 1),
  "na.severeAbove": String(P.sodiumCorrection.severeHyperglycemiaAboveMgDl),
  "ddr.low": String(P.deltaRatio.boundaries[0]),
  "ddr.high": String(P.deltaRatio.boundaries[1]),
  "hhs": String(P.osmolality.hhsEffectiveThreshold),
  "phos": br(P.phosphate.considerBelowMmolL, 1),
  // valor DERIVADO pelo core (nao um literal): osm efetiva do exercicio B-6
  "osm.b6": br(cad.effectiveOsmolality(130, 600), 1),
};

function resolveTokens(srcHtml) {
  const used = new Set();
  const resolved = srcHtml.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    if (!(key in TOKENS)) { bad(`token desconhecido: {{${key}}}`); return m; }
    used.add(key);
    return TOKENS[key];
  });
  const leftover = resolved.match(/\{\{[^}]*\}\}/g);
  if (leftover) bad(`token(s) nao resolvido(s): ${[...new Set(leftover)].join(", ")}`);
  const unused = Object.keys(TOKENS).filter((k) => !used.has(k));
  if (unused.length) console.warn(`  aviso  token(s) definido(s) mas nao usado(s): ${unused.join(", ")}`);
  return resolved;
}

// remove o comentario-cabecalho da fonte antes de embutir
function stripSourceHeader(html) {
  return html.replace(/^\s*<!--[\s\S]*?-->\s*/, "");
}

const STYLE = `
:root{--tx:#1a1d21;--mut:#5b6470;--line:#d8dee6;--teal:#0b7285;--bg:#fff;--accent:#f2f6f8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.6 -apple-system,Segoe UI,Roboto,"Helvetica Neue",sans-serif}
.doc{max-width:820px;margin:0 auto;padding:48px 44px 64px}
h1{font-size:23px;margin:34px 0 10px;padding-bottom:8px;border-bottom:2px solid var(--teal);color:var(--teal);letter-spacing:-.3px}
h1:first-of-type{margin-top:6px}
h2{font-size:18px;margin:26px 0 8px;letter-spacing:-.2px}
h3{font-size:15px;margin:20px 0 6px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}
p{margin:9px 0}
ul{margin:9px 0;padding-left:22px}
li{margin:4px 0}
strong{font-weight:640}
table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13.5px}
th,td{border:1px solid var(--line);padding:7px 10px;text-align:left;vertical-align:top}
thead th,tr:first-child th{background:var(--accent)}
/* callout = tabela de celula unica (nota/exercicio/gabarito no original) */
table:has(tr:only-child th:only-child){border:0}
table:has(tr:only-child th:only-child) th{background:var(--accent);border:1px solid var(--line);border-left:3px solid var(--teal);border-radius:6px;font-weight:400}
.doc-title{font-size:30px;font-weight:700;letter-spacing:-.6px;margin:0}
.doc-subtitle{font-size:16px;color:var(--mut);margin:2px 0}
.meta{color:var(--mut);font-size:13px;border-top:1px solid var(--line);margin-top:40px;padding-top:12px}
@page{size:A4;margin:18mm 16mm}
@media print{.doc{padding:0;max-width:none}h1,h2,h3{break-after:avoid}table,ul{break-inside:avoid}}
`;

function wrapHtml(bodyFrag) {
  const stamp = `CAD 360 — Auditoria · fonte: ${canon.version} · gerado de docs/auditoria.src.html (numeros de canon/policy.json)`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CAD 360 — Auditoria</title>
<style>${STYLE}</style>
</head>
<body>
<main class="doc">
${bodyFrag.trim()}
<p class="meta">${stamp}</p>
</main>
</body>
</html>
`;
}

// ---- assercoes anti-drift sobre o texto renderizado (rede de seguranca) ----
function assertCanon(html) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d));
  const PRESENT = [
    [/K\s*<\s*5,0/, "K < 5,0 (reposicao canonica)"],
    [/≥\s*3,5/, "reinicio de insulina ≥ 3,5"],
    [/293,3/, "osm efetiva 293,3 (Na MEDIDO)"],
    [/limítrofe/, "Δ/Δ 'limítrofe' (nao 'quase pura')"],
    [/pH\s*<\s*7,0/, "bicarbonato pH < 7,0"],
    [/6,9/, "bicarbonato fronteira 6,9"],
    [/>\s*320/, "HHS > 320"],
  ];
  const ABSENT = [
    [/quase pura/i, "Δ/Δ 'quase pura' (obsoleto)"],
    [/317,3|2·142|2×142/, "osm com Na corrigido (317,3 / 2·142)"],
    [/(?:reinic\w*|insulina)[^.]{0,40}>\s*3[.,]5(?!\d)/i, "operador '> 3,5' no reinicio"],
    [/K\s*>\s*3,3/, "reinicio 'K > 3,3' (obsoleto)"],
  ];
  PRESENT.forEach(([re, l]) => { if (!re.test(text)) bad(`canon AUSENTE no render: ${l}`); });
  ABSENT.forEach(([re, l]) => { if (re.test(text)) bad(`forma obsoleta no render: ${l}`); });
}

async function main() {
  const src = fs.readFileSync(SRC, "utf8");
  const resolved = resolveTokens(stripSourceHeader(src));
  const html = wrapHtml(resolved);
  assertCanon(html);

  if (isCheck) {
    let committed = null;
    try { committed = fs.readFileSync(OUT_HTML, "utf8"); } catch (e) { bad(`docs/auditoria.html ausente — rode 'npm run build:auditoria'`); }
    if (committed != null && committed !== html) {
      bad("docs/auditoria.html fora de sincronia com a fonte+canon — rode 'npm run build:auditoria' e commite");
    }
    if (fails) { console.error(`build_auditoria --check: ${fails} FALHA(S).`); process.exit(1); }
    console.log("build_auditoria --check: auditoria.html em sincronia com a fonte tokenizada e o canon.");
    return;
  }

  if (fails) { console.error(`build_auditoria: ${fails} FALHA(S) na fonte — nao renderizado.`); process.exit(1); }
  fs.writeFileSync(OUT_HTML, html);
  console.log(`build_auditoria: docs/auditoria.html escrito (${html.length} chars).`);

  // PDF via Chromium (Playwright) — mesmo motor/resolucao do render_smoke
  // (playwright e' instalado GLOBALMENTE neste ambiente; sem node_modules local)
  const chromium = loadChromium();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({ path: OUT_PDF, format: "A4", printBackground: true, margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" } });
    console.log(`build_auditoria: docs/auditoria.pdf renderizado via Chromium.`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error("build_auditoria: erro", e); process.exit(1); });
