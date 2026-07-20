"use strict";
/*
 * cad_core.contract.test.js — contrato de entrada de classifyDkaProfile() nas
 * fronteiras clínicas de kMmolL e nos tipos inválidos.
 *
 * Nasceu da arbitragem PR #32 x PR #33 (ver FIGHT.md): a #33 propôs um guard
 * mais "estrito" para kMmolL (isProvided() sem checar NaN) alegando que a
 * versão original (#32) deixava tipos inválidos atravessarem em silêncio.
 * Verificação ao vivo mostrou o oposto -- o guard original da #32 já lança
 * TypeError para string/objeto/array/±Infinity (delegado a requiredNumber()
 * dentro de potassiumPlan()); o único ponto que a #33 mudava de fato era
 * NaN, e mudava na direção ERRADA: fazia NaN em kMmolL (campo opcional)
 * lançar exceção não capturada, enquanto NaN em qualquer campo OBRIGATÓRIO
 * da mesma função (na/cl/hco3/glucoseMgDl/ph) já degrada graciosamente para
 * {insufficient:true, missing:[...]} -- duas regras para o mesmo valor
 * inválido dentro do mesmo classifyDkaProfile().
 *
 * Este arquivo fixa o contrato correto (o da #32, já em produção, sem
 * mudança de código): NaN == "não fornecido" em qualquer campo, obrigatório
 * ou opcional -- é assim que o próprio parseFloat() do formulário do
 * Tutor/Marco representa "campo em branco" (perfis/index.html,
 * tratado/index.html: `isNaN(v)?null:v`). String/objeto/array/±Infinity
 * continuam sendo erro de contrato (TypeError), porque não representam
 * "ausência", representam entrada de tipo errado.
 *
 *   node core/cad_core.contract.test.js
 */
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

// Campo opcional ausente (undefined): mantém contrato explícito, sem nota de potássio.
{
  const result = classifyDkaProfile(BASE);
  assert.strictEqual(result.insufficient, false);
  assert.strictEqual(result.computed.potassiumPlan, null);
}

// NaN em kMmolL (campo opcional) == "não fornecido", não é erro de contrato.
// Mesma convenção usada pelos dois chamadores reais (Tutor/Marco), que já
// convertem parseFloat("")=NaN para null antes de chamar este classificador.
{
  const result = classifyWithK(Number.NaN);
  assert.strictEqual(result.insufficient, false);
  assert.strictEqual(result.computed.potassiumPlan, null);
}

// Simetria com os campos OBRIGATÓRIOS: NaN neles também é "ausente", nunca
// exceção -- é o mesmo comportamento pré-existente que motivou a regra
// acima. Testado aqui para deixar a simetria explícita e travada por teste,
// não só documentada em comentário.
["na", "cl", "hco3", "glucoseMgDl", "ph"].forEach((field) => {
  const result = classifyDkaProfile({ ...BASE, [field]: Number.NaN });
  assert.strictEqual(result.insufficient, true, `${field}=NaN deveria ser insufficient`);
  assert.ok(result.missing.includes(field), `${field}=NaN deveria aparecer em missing`);
});

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

// Entrada presente e de TIPO errado (não NaN, não ausência) é erro de
// contrato de verdade -- não deve ser tratada como "campo ausente" nem
// atravessar silenciosamente até uma saída enganosa.
[
  "4.2",
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

console.log("cad_core.contract.test.js: contrato de kMmolL (NaN=ausente, tipo errado=TypeError) e fronteiras OK");
