"use strict";
/*
 * check_consistency.js — o portao de fonte unica do CAD 360.
 * Falha (exit 1) se core.js, canon/policy.json, os source.json dos lotes
 * ou o app/index.html divergirem da doutrina. Roda no CI a cada push.
 *
 *   node scripts/check_consistency.js
 */
const fs = require("fs");
const path = require("path");
const core = require("../core/cad_core.js");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };
function eq(label, a, b) { (a === b ? ok : bad)(`${label}: ${a} == ${b}`); }
function near(label, a, b, tol = 0.1) {
  (Math.abs(a - b) <= tol ? ok : bad)(`${label}: ${a} ~= ${b} (tol ${tol})`);
}

console.log("\n[1] core.js POLICY  ==  canon/policy.json");
const P = core.POLICY;
const C = json("canon/policy.json");
eq("version", P.version, C.version);
eq("K repor <", P.potassium.replaceBelowMmolL, C.potassium.replaceBelowMmolL);
eq("K adiar insulina <", P.potassium.holdInsulinBelowMmolL, C.potassium.holdInsulinBelowMmolL);
eq("diagnostico betaOHB", P.diagnosis.betaHydroxybutyrateMmolL, C.diagnosis.betaHydroxybutyrateMmolL);
eq("diagnostico pH", P.diagnosis.ph, C.diagnosis.ph);
eq("bicarbonato considerar pH<", P.bicarbonate.considerBelowPh, C.bicarbonate.considerBelowPh);
eq("Na fator padrao", P.sodiumCorrection.factorDefault, C.sodiumCorrection.factorDefault);
eq("Na fator grave", P.sodiumCorrection.factorSevereHyperglycemia, C.sodiumCorrection.factorSevereHyperglycemia);

console.log("\n[2] core.js — comportamento das bandas");
eq("K 3,2 -> hold", core.potassiumPlan(3.2).insulin, "hold");
eq("K 4,0 -> allowed", core.potassiumPlan(4.0).insulin, "allowed");
eq("K 5,5 -> ainda allowed (repor ja parou em 5,0)", core.potassiumPlan(5.5).insulin, "allowed");
eq("delta 0,9 -> <1", core.interpretDeltaRatio(0.9).band, "<1");
eq("delta 1,5 -> 1-2", core.interpretDeltaRatio(1.5).band, "1-2");
eq("delta 2,5 -> >2", core.interpretDeltaRatio(2.5).band, ">2");
near("osm efetiva(130,600) usa Na medido", core.effectiveOsmolality(130, 600), 293.3);

console.log("\n[3] deltaRatio / osm em canon/policy.json");
eq("delta fronteiras", JSON.stringify(C.deltaRatio.boundaries), "[1,2]");
if (/Na MEDIDO|Na medido/.test(C.osmolality.rule)) ok("policy: osm efetiva usa Na medido"); else bad("policy: regra de osm nao fixa Na medido");

console.log("\n[4] pranchas — lote1 e lote2 batem com o canon");
const l1 = json("pranchas/lote1/source/cad_lote1_source.json");
const dd = l1.clinical_policy.delta_ratio.canon.map((x) => x.range).join(" ");
if (/< 1/.test(dd) && /1-2/.test(dd) && /> 2/.test(dd)) ok("lote1 delta: <1 / 1-2 / >2"); else bad("lote1 delta divergente: " + dd);
if (/[Uu]reia atravessa/.test(l1.clinical_policy.osmolality.rule)) ok("lote1: ureia fora da efetiva"); else bad("lote1: regra de osm ausente");

const l2 = json("pranchas/lote2/source/cad_lote2_source.json");
const m07 = l2.modules.find((m) => m.id === "M07").canon.join(" | ");
if (/K < 3,5/.test(m07) && /3,5-5,0/.test(m07) && /5,0/.test(m07) && !/5,5/.test(m07)) ok("M07 potassio: 3,5 / 5,0, sem 5,5"); else bad("M07 potassio divergente: " + m07);
const m08 = l2.modules.find((m) => m.id === "M08").canon.join(" | ");
if (/pH < 7,0/.test(m08) && /[Nn]ao e rotina|nao e solucao causal/.test(m08)) ok("M08 bicarbonato: pH<7,0, nao-rotina"); else bad("M08 bicarbonato divergente");

console.log("\n[5] osm de TODOS os exercicios usa Na medido (pega o furo do EX04)");
for (const ex of l2.exercises) {
  const c = ex.case || {};
  if (typeof c.na === "number" && typeof c.glucose === "number" && typeof c.effective_osm === "number") {
    near(`${ex.id} osm efetiva`, c.effective_osm, core.effectiveOsmolality(c.na, c.glucose), 0.5);
  }
}

console.log("\n[6] app/index.html — presenca do canon e ausencia de instrucao obsoleta");
const html = read("app/index.html");
const need = ["repor_abaixo:5.0", "adiar_insulina_abaixo:3.5", "reiniciar_acima:3.5", "fronteiras:[1,2]", "hhs_efetiva:320"];
need.forEach((t) => (html.includes(t) ? ok("HTML contem " + t) : bad("HTML SEM " + t)));
// mira a FORMA DE INSTRUCAO obsoleta, nao a mencao pedagogica negada ("nao 3,3")
const banned = [
  [/K\s*[>≥]=?\s*3,3/, "instrucao 'reiniciar K > 3,3' (piso antigo)"],
  [/K\s*<\s*5,5/, "instrucao 'K < 5,5' (JBDS)"],
  [/3,5\s*[-–]\s*5,5/, "banda 'K 3,5-5,5' (JBDS)"],
];
banned.forEach(([re, label]) => (re.test(html) ? bad("HTML contem " + label) : ok("HTML sem " + label)));

console.log("\n[7] app/index.html expoe POLICY em <script type=application/json id=canon> — deep-equal vs core");
{
  const assert = require("assert");
  const m = html.match(/<script[^>]*id="canon"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) {
    bad("app: bloco JSON id=canon ausente");
  } else {
    let embedded = null;
    try { embedded = JSON.parse(m[1]); } catch (e) { bad("app: bloco canon nao e JSON valido: " + e.message); }
    if (embedded) {
      try {
        assert.deepStrictEqual(embedded, JSON.parse(JSON.stringify(P)));
        ok("app: bloco canon == core.POLICY (valor-a-valor)");
      } catch (e) {
        bad("app: bloco canon DIVERGE de core.POLICY (" + (e.message || "").split("\n")[0] + ")");
      }
    }
  }
}

console.log("");
if (fails) { console.error(`CONSISTENCIA: ${fails} FALHA(S).`); process.exit(1); }
console.log("CONSISTENCIA: tudo alinhado a fonte de verdade.");
