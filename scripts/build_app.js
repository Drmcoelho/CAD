"use strict";
/*
 * build_app.js — saídas como artefato de build (ROADMAP Fases 4a + 3).
 *
 * Injeta no app/index.html, a partir das FONTES, três blocos
 * <script type="application/json" id="...">:
 *   - canon          ← core.POLICY            (os NÚMEROS clínicos)
 *   - questions-data ← content/questions.json (banco do provão)
 *   - cases-data     ← content/cases.json     (casos socráticos)
 *
 * O app lê esses blocos em runtime (JSON.parse), então a fonte de cada bloco é
 * única e versionada; editar o bloco à mão é sobrescrito pelo build.
 *
 *   node scripts/build_app.js          # reescreve os blocos a partir das fontes
 *   node scripts/build_app.js --check  # falha (exit 1) se algum bloco divergir
 *
 * O --check roda no CI: garante app commitado == o que o build geraria.
 */
const fs = require("fs");
const path = require("path");
const { POLICY } = require("../core/cad_core.js");

const root = path.join(__dirname, "..");
const appPath = path.join(root, "app", "index.html");
const check = process.argv.includes("--check");
const readJson = (p) => fs.readFileSync(path.join(root, p), "utf8").trim();

// fonte de cada bloco: texto JSON canônico (validado por JSON.parse)
function jsonText(label, raw) {
  try { JSON.parse(raw); } catch (e) { console.error(`build_app: ${label} nao e JSON valido: ${e.message}`); process.exit(1); }
  return raw;
}
const BLOCKS = [
  { id: "canon", text: JSON.stringify(POLICY, null, 2) },
  { id: "questions-data", text: jsonText("content/questions.json", readJson("content/questions.json")) },
  { id: "cases-data", text: jsonText("content/cases.json", readJson("content/cases.json")) },
];

let html = fs.readFileSync(appPath, "utf8");
let changed = 0;
const stale = [];
for (const { id, text } of BLOCKS) {
  const re = new RegExp(`(<script[^>]*id="${id}"[^>]*>)([\\s\\S]*?)(</script>)`);
  const m = html.match(re);
  if (!m) { console.error(`build_app: bloco <script id=${id}> nao encontrado em app/index.html`); process.exit(1); }
  const next = html.replace(re, `$1\n${text}\n$3`);
  if (next !== html) { changed++; stale.push(id); html = next; }
}

if (!changed) { console.log("build_app: blocos (canon, questions-data, cases-data) em sincronia com as fontes."); process.exit(0); }

if (check) {
  console.error(`build_app: bloco(s) FORA DE SINCRONIA: ${stale.join(", ")}. Rode \`npm run build\`.`);
  process.exit(1);
}

fs.writeFileSync(appPath, html);
console.log(`build_app: bloco(s) regenerado(s) a partir das fontes: ${stale.join(", ")}.`);
