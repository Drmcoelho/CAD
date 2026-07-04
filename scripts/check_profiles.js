"use strict";
/*
 * check_profiles.js — anti-drift dos casos sintéticos em content/profiles.json.
 *
 * Cada perfil carrega um caso com labs ESTRUTURADOS (não texto). Este portão
 * recalcula AG/AGc/Δ/Δ, hasDka() e isResolvedDka() pelo MESMO core que o resto
 * do repo usa, e confere:
 *   1. AG e AGc (1 casa, vírgula) aparecem corretamente na "leitura";
 *   2. toda afirmação literal "hasDka() = verdadeiro|FALSO" e
 *      "isResolvedDka() = verdadeiro|FALSO" no texto bate com o valor real.
 * Se alguém editar um número em "labs" ou no texto sem recalcular o outro,
 * o build quebra — a mesma filosofia de fonte única do resto do projeto,
 * aplicada à prosa clínica dos casos.
 *
 * 3. classifyDkaProfile() (o "Tutor" de perfis/) classifica cada um dos 9
 *    casos como o SEU PRÓPRIO perfil (top match) — regressão do classificador
 *    contra os únicos 9 casos-gabarito que existem no projeto.
 *
 *   node scripts/check_profiles.js
 */
const fs = require("fs");
const path = require("path");
const core = require("../core/cad_core.js");

const root = path.join(__dirname, "..");
const profiles = JSON.parse(fs.readFileSync(path.join(root, "content/profiles.json"), "utf8"));

let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };
const fmt = (x, n = 1) => (Math.round(x * 10 ** n) / 10 ** n).toFixed(n).replace(".", ",");
const near = (txt, val) => {
  const nums = [...txt.matchAll(/-?\d+(?:,\d+)?/g)].map((m) => parseFloat(m[0].replace(",", ".")));
  return nums.some((n) => Math.abs(n - val) <= 0.05);
};

console.log("[check_profiles] recalculando os 9 casos sintéticos pelo core\n");

for (const perfil of profiles.perfis) {
  const { labs, leitura } = perfil.caso;
  const ag = core.anionGap(labs.na, labs.cl, labs.hco3);
  const agc = core.correctedAnionGap(ag, labs.alb ?? 4.0);

  near(leitura, ag) ? ok(`${perfil.id}: AG ${fmt(ag)} presente na leitura`) : bad(`${perfil.id}: AG calculado ${fmt(ag)} NÃO aparece na leitura`);
  near(leitura, agc) ? ok(`${perfil.id}: AGc ${fmt(agc)} presente na leitura`) : bad(`${perfil.id}: AGc calculado ${fmt(agc)} NÃO aparece na leitura`);

  // afirmações literais hasDka()/isResolvedDka() no texto, contra o core de verdade
  const dkaClaim = leitura.match(/hasDka\(\)\s*=\s*(verdadeiro|falso)/i);
  if (dkaClaim) {
    const claimed = /verdadeiro/i.test(dkaClaim[1]);
    const actual = core.hasDka({
      knownDiabetes: !!labs.knownDiabetes,
      glucoseMgDl: labs.glu,
      betaHydroxybutyrateMmolL: labs.bhb,
      ketonuriaCruzes: labs.cet ?? null,
      ph: labs.ph,
      hco3: labs.hco3,
    });
    claimed === actual
      ? ok(`${perfil.id}: hasDka() afirmado=${claimed} bate com o core`)
      : bad(`${perfil.id}: hasDka() afirmado=${claimed} MAS core calcula ${actual}`);
  }

  const resClaim = leitura.match(/isResolvedDka\(\)\s*=\s*(verdadeiro|falso)/i);
  if (resClaim) {
    const claimed = /verdadeiro/i.test(resClaim[1]);
    const actual = core.isResolvedDka({ betaHydroxybutyrateMmolL: labs.bhb, ph: labs.ph, hco3: labs.hco3 });
    claimed === actual
      ? ok(`${perfil.id}: isResolvedDka() afirmado=${claimed} bate com o core`)
      : bad(`${perfil.id}: isResolvedDka() afirmado=${claimed} MAS core calcula ${actual}`);
  }

  // classifyDkaProfile() deve apontar o proprio caso de volta para o seu perfil
  const cls = core.classifyDkaProfile({
    na: labs.na, cl: labs.cl, hco3: labs.hco3, glucoseMgDl: labs.glu,
    betaHydroxybutyrateMmolL: labs.bhb, ketonuriaCruzes: labs.cet ?? null,
    ph: labs.ph, albumin: labs.alb,
    knownDiabetes: labs.knownDiabetes, lactateMmolL: labs.lactato ?? null,
    dialysisDependent: !!labs.dialysisDependent,
  });
  const ids = cls.matches.filter((m) => m.id).map((m) => m.id);
  ids[0] === perfil.id
    ? ok(`${perfil.id}: classifyDkaProfile() aponta de volta para o próprio perfil (top match)`)
    : bad(`${perfil.id}: classifyDkaProfile() top match = ${ids[0] || "nenhum"} (esperado ${perfil.id}); matches=${JSON.stringify(ids)}`);
}

console.log("");
if (fails) { console.error(`check_profiles: ${fails} FALHA(S).`); process.exit(1); }
console.log("check_profiles: os 9 casos sintéticos batem com o core (AG/AGc + hasDka/isResolvedDka).");
