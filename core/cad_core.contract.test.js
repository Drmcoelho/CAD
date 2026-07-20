"use strict";

const assert = require("assert");
const { classifyDkaProfile } = require("./cad_core.js");

const BASE = Object.freeze({
  na: 132,
  cl: 92,
  hco3: 8,
  glucoseMgDl: 480,
  ketonuriaCruzes: 3,
  ph: 7.15,
});

function classifyWithK(kMmolL) {
  return classifyDkaProfile({ ...BASE, kMmolL });
}

// Campo opcional ausente: mantém contrato explícito sem nota de potássio.
{
  const result = classifyDkaProfile(BASE);
  assert.strictEqual(result.insufficient, false);
  assert.strictEqual(result.computed.potassiumPlan, null);
}

// Fronteiras clínicas exatas: <3,5 segura insulina; 3,5 libera com reposição;
// 5,0 muda para a banda sem reposição inicial.
[
  { k: 3.499, band: "<3.5", insulin: "hold" },
  { k: 3.5, band: "3.5-5.0", insulin: "allowed" },
  { k: 4.999, band: "3.5-5.0", insulin: "allowed" },
  { k: 5.0, band: ">=5.0", insulin: "allowed" },
].forEach(({ k, band, insulin }) => {
  const result = classifyWithK(k);
  assert.strictEqual(result.computed.potassiumPlan.band, band, `K ${k}: banda`);
  assert.strictEqual(result.computed.potassiumPlan.insulin, insulin, `K ${k}: insulina`);
});

// Entrada presente, porém inválida, é erro de contrato — não deve ser tratada
// como "campo ausente" nem atravessar silenciosamente até uma saída enganosa.
[
  "4.2",
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  {},
  [],
].forEach((invalidK) => {
  assert.throws(
    () => classifyWithK(invalidK),
    (error) => error instanceof TypeError && /kMmolL must be a finite number/.test(error.message),
    `kMmolL inválido deveria lançar TypeError: ${String(invalidK)}`
  );
});

console.log("cad_core.contract.test.js: contrato de kMmolL e fronteiras OK");
