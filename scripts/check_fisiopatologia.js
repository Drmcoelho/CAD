"use strict";
/*
 * check_fisiopatologia.js — anti-drift do banco de mecanismo/fisiopatologia
 * (content/fisiopatologia.json) e das questões de conduta em content/questions.json.
 *
 * Cada questão pode carregar um array "computed": afirmações numéricas/textuais
 * no "exp"/opções que são, na verdade, a saída de uma função determinística de
 * core/cad_core.js ou core/abg_core.js. Este portão CHAMA a função de verdade e
 * confere que o valor declarado bate — mesma filosofia de check_profiles.js/
 * check_gasometrias.js, aplicada à prosa de mecanismo/conduta em vez de casos
 * clínicos completos. content/questions.json usa o mesmo campo "computed" nas
 * questões de conduta (K/insulina) ancoradas a potassiumPlan()/insulinPlan();
 * este portão varre ambos os arquivos (inclusive "subs" de questões "case").
 *
 *   "computed": [
 *     { "module": "cad"|"abg", "fn": "nomeDaFuncao", "args": [...], "path": "opcional.dot.path",
 *       "expect": valor, "tol": opcional (padrão 0.05 para números) }
 *   ]
 *
 *   node scripts/check_fisiopatologia.js
 */
const fs = require("fs");
const path = require("path");
const cad = require("../core/cad_core.js");
const abg = require("../core/abg_core.js");

const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "content/fisiopatologia.json"), "utf8"));
const questions = JSON.parse(fs.readFileSync(path.join(root, "content/questions.json"), "utf8"));

let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };

function getPath(obj, dotPath) {
  if (!dotPath) return obj;
  return dotPath.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function checkOne(label, spec) {
  const mod = spec.module === "abg" ? abg : spec.module === "cad" ? cad : null;
  if (!mod) return bad(`${label}: module "${spec.module}" desconhecido (use "cad" ou "abg")`);
  const fn = mod[spec.fn];
  if (typeof fn !== "function") return bad(`${label}: função "${spec.fn}" não existe em ${spec.module}_core.js`);
  let actual;
  try {
    actual = fn(...spec.args);
  } catch (e) {
    return bad(`${label}: ${spec.module}.${spec.fn}(${JSON.stringify(spec.args)}) lançou erro: ${e.message}`);
  }
  const value = getPath(actual, spec.path);
  const expect = spec.expect;
  let matches;
  if (expect === null) {
    matches = value === null;
  } else if (typeof expect === "number") {
    const tol = spec.tol ?? 0.05;
    matches = typeof value === "number" && Math.abs(value - expect) <= tol;
  } else {
    matches = value === expect;
  }
  matches
    ? ok(`${label}: ${spec.module}.${spec.fn}(${JSON.stringify(spec.args)})${spec.path ? "." + spec.path : ""} = ${JSON.stringify(value)} (esperado ${JSON.stringify(expect)})`)
    : bad(`${label}: ${spec.module}.${spec.fn}(${JSON.stringify(spec.args)})${spec.path ? "." + spec.path : ""} = ${JSON.stringify(value)}, esperado ${JSON.stringify(expect)}`);
}

console.log(`[check_fisiopatologia] recalculando ${data.length} questão(ões) de fisiopatologia.json pelo core\n`);

data.forEach((item, i) => {
  const label = `#${i + 1} (${item.type})`;
  (item.computed || []).forEach((spec, j) => checkOne(`${label} computed[${j}]`, spec));
});

const questionsWithComputed = questions.flatMap((item, i) =>
  item.type === "case"
    ? (item.subs || []).map((s, j) => ({ item: s, label: `questions.json#${i + 1}.subs[${j}]` }))
    : [{ item, label: `questions.json#${i + 1}` }]
);
const totalComputed = questionsWithComputed.reduce((n, { item }) => n + (item.computed || []).length, 0);
console.log(`[check_fisiopatologia] recalculando ${totalComputed} anchor(s) de conduta em questions.json pelo core\n`);
questionsWithComputed.forEach(({ item, label }) => {
  (item.computed || []).forEach((spec, j) => checkOne(`${label} computed[${j}]`, spec));
});

// estrutura mínima: cada questão precisa de "q" e de "exp" (mcq/vf) ou "model" (diss)
data.forEach((item, i) => {
  const label = `#${i + 1}`;
  typeof item.q === "string" && item.q.length > 5 ? null : bad(`${label}: campo "q" ausente/curto`);
  if (item.type === "mcq") {
    Array.isArray(item.opts) && item.opts.length >= 2 ? null : bad(`${label}: mcq precisa de >=2 opts`);
    Number.isInteger(item.correct) && item.correct >= 0 && item.correct < item.opts.length ? null : bad(`${label}: "correct" fora do range de opts`);
    typeof item.exp === "string" && item.exp.length > 5 ? null : bad(`${label}: mcq precisa de "exp"`);
  } else if (item.type === "vf") {
    typeof item.correct === "boolean" ? null : bad(`${label}: vf precisa de "correct" booleano`);
    typeof item.exp === "string" && item.exp.length > 5 ? null : bad(`${label}: vf precisa de "exp"`);
  } else if (item.type === "diss") {
    typeof item.model === "string" && item.model.length > 20 ? null : bad(`${label}: diss precisa de "model" substancial`);
  } else {
    bad(`${label}: type "${item.type}" desconhecido (use mcq/vf/diss)`);
  }
});

console.log("");
if (fails) { console.error(`check_fisiopatologia: ${fails} FALHA(S).`); process.exit(1); }
console.log(`check_fisiopatologia: ${data.length} questão(ões) batem com cad_core/abg_core.`);
