"use strict";
/*
 * build_app.js — saídas como artefato de build (ROADMAP Fases 4a + 3).
 *
 * Injeta, a partir das FONTES, blocos <script type="application/json" id="...">
 * nas saídas HTML. Cada saída lê seus blocos em runtime (JSON.parse), então a
 * fonte de cada bloco é única e versionada; editar o bloco à mão é sobrescrito.
 *
 *   app/index.html:
 *     - canon          ← core.POLICY            (os NÚMEROS clínicos)
 *     - questions-data ← content/questions.json (banco do provão)
 *     - cases-data     ← content/cases.json     (casos socráticos)
 *     - atlas-data     ← content/atlas.json     (cálculo, escada, fenótipos, leis, projetos)
 *   perfis/index.html:
 *     - profiles-data  ← content/profiles.json  (fisiopatologia + tratamento por perfil)
 *   tratado/index.html:
 *     - profile-names-data ← content/profiles.json, projetado a {id,nome} (o Tutor só
 *       precisa do nome pra rotular o match e link para ../perfis/#p-<id>; a prosa
 *       completa não é duplicada aqui)
 *
 *   node scripts/build_app.js          # reescreve os blocos a partir das fontes
 *   node scripts/build_app.js --check  # falha (exit 1) se algum bloco divergir
 *
 * O --check roda no CI: garante que as saídas commitadas == o que o build geraria.
 */
const fs = require("fs");
const path = require("path");
const { POLICY } = require("../core/cad_core.js");

const root = path.join(__dirname, "..");
const check = process.argv.includes("--check");
const readRaw = (p) => fs.readFileSync(path.join(root, p), "utf8").trim();

// fonte de cada bloco: texto JSON canônico (validado por JSON.parse)
function jsonText(label, raw) {
  try { JSON.parse(raw); } catch (e) { console.error(`build_app: ${label} nao e JSON valido: ${e.message}`); process.exit(1); }
  return raw;
}

// blocos agrupados por arquivo de saída
const FILES = {
  "app/index.html": [
    { id: "canon", text: JSON.stringify(POLICY, null, 2) },
    { id: "questions-data", text: jsonText("content/questions.json", readRaw("content/questions.json")) },
    { id: "cases-data", text: jsonText("content/cases.json", readRaw("content/cases.json")) },
    { id: "atlas-data", text: jsonText("content/atlas.json", readRaw("content/atlas.json")) },
  ],
  "perfis/index.html": [
    { id: "profiles-data", text: jsonText("content/profiles.json", readRaw("content/profiles.json")) },
  ],
  "tratado/index.html": [
    { id: "profile-names-data", text: JSON.stringify(profileNames()) },
  ],
};

function profileNames() {
  const profiles = jsonText("content/profiles.json", readRaw("content/profiles.json"));
  return JSON.parse(profiles).perfis.map((p) => ({ id: p.id, nome: p.nome }));
}

const stale = [];
const writes = [];
for (const [rel, blocks] of Object.entries(FILES)) {
  const file = path.join(root, rel);
  let html = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const { id, text } of blocks) {
    const re = new RegExp(`(<script[^>]*id="${id}"[^>]*>)([\\s\\S]*?)(</script>)`);
    if (!html.match(re)) { console.error(`build_app: bloco <script id=${id}> nao encontrado em ${rel}`); process.exit(1); }
    const next = html.replace(re, `$1\n${text}\n$3`);
    if (next !== html) { stale.push(`${rel}#${id}`); html = next; changed = true; }
  }
  if (changed) writes.push([file, html]);
}

const allIds = Object.values(FILES).flat().map((b) => b.id).join(", ");
if (!stale.length) { console.log(`build_app: blocos (${allIds}) em sincronia com as fontes.`); process.exit(0); }

if (check) {
  console.error(`build_app: bloco(s) FORA DE SINCRONIA: ${stale.join(", ")}. Rode \`npm run build\`.`);
  process.exit(1);
}

writes.forEach(([file, html]) => fs.writeFileSync(file, html));
console.log(`build_app: bloco(s) regenerado(s): ${stale.join(", ")}.`);
