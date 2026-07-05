"use strict";

const assert = require("assert");
const { classifyPrimaryDisturbance, expectedPco2MetabolicAcidosis } = require("../core/abg_core");

function testPureMetabolicAcidosisAdequateCompensation() {
  const r = classifyPrimaryDisturbance({ ph: 7.25, pco2: 22, hco3: 10 });
  assert.strictEqual(r.acidemia, true);
  assert.deepStrictEqual(r.primary.map((p) => p.type), ["metabolicAcidosis"]);
  assert.strictEqual(r.compensationCheck.verdict, "adequado");
}

function testMetabolicAcidosisWithInsufficientRespiratoryCompensation() {
  // pCO2 "normal" (40) mas o esperado para HCO3=10 seria ~23 -- insuficiente
  const r = classifyPrimaryDisturbance({ ph: 7.15, pco2: 40, hco3: 10 });
  const types = r.primary.map((p) => p.type);
  assert.ok(types.includes("metabolicAcidosis"));
  assert.ok(types.includes("respiratoryAcidosis"), "pCO2 'normal' mas insuficiente deve apontar acidose respiratoria adicional");
  assert.strictEqual(r.compensationCheck.verdict, "insuficiente");
}

function testMetabolicAcidosisWithExcessiveCompensationRevealsAlkalosis() {
  const exp = expectedPco2MetabolicAcidosis(10); // ~23
  const r = classifyPrimaryDisturbance({ ph: 7.30, pco2: exp.low - 3, hco3: 10 });
  const types = r.primary.map((p) => p.type);
  assert.ok(types.includes("metabolicAcidosis"));
  assert.ok(types.includes("respiratoryAlkalosis"));
  assert.strictEqual(r.compensationCheck.verdict, "excessivo");
}

function testMixedAcidosisNeverReadAsCompensation() {
  // HCO3 baixo E pCO2 alto ao mesmo tempo -- fisiologicamente nunca e' compensacao
  const r = classifyPrimaryDisturbance({ ph: 7.05, pco2: 60, hco3: 10 });
  const types = r.primary.map((p) => p.type).sort();
  assert.deepStrictEqual(types, ["metabolicAcidosis", "respiratoryAcidosis"]);
  assert.strictEqual(r.compensationCheck, null);
}

function testMixedAlkalosisNeverReadAsCompensation() {
  const r = classifyPrimaryDisturbance({ ph: 7.55, pco2: 25, hco3: 32 });
  const types = r.primary.map((p) => p.type).sort();
  assert.deepStrictEqual(types, ["metabolicAlkalosis", "respiratoryAlkalosis"]);
  assert.strictEqual(r.compensationCheck, null);
}

function testRespiratoryAcidosisWithoutChronicityHintShowsBothWindows() {
  const r = classifyPrimaryDisturbance({ ph: 7.32, pco2: 60, hco3: 25 });
  assert.deepStrictEqual(r.primary.map((p) => p.type), ["respiratoryAcidosis"]);
  assert.ok(r.compensationCheck.acute && r.compensationCheck.chronic, "sem chronicityHint deve mostrar as duas janelas, nunca adivinhar");
  assert.ok(r.notes.some((n) => n.includes("agudeza não informada")));
}

function testRespiratoryAcidosisWithChronicityHintPicksOneWindow() {
  const r = classifyPrimaryDisturbance({ ph: 7.32, pco2: 60, hco3: 25, chronicityHint: "acute" });
  assert.strictEqual(r.compensationCheck.for, "respiratoryAcidosisAcute");
  assert.strictEqual(r.compensationCheck.verdict, "adequado");
}

function testRespiratoryAlkalosisInsufficientRevealsMetabolicAlkalosis() {
  // pCO2 baixo (25), mas HCO3 alto demais para o esperado -> alcalose metabolica adicional
  const r = classifyPrimaryDisturbance({ ph: 7.5, pco2: 25, hco3: 24, chronicityHint: "acute" });
  const types = r.primary.map((p) => p.type);
  assert.ok(types.includes("respiratoryAlkalosis"));
  assert.ok(types.includes("metabolicAlkalosis"));
  assert.strictEqual(r.compensationCheck.verdict, "insuficiente");
}

function testAllNormalNoDisturbance() {
  const r = classifyPrimaryDisturbance({ ph: 7.40, pco2: 40, hco3: 24 });
  assert.deepStrictEqual(r.primary, []);
  assert.ok(r.notes.some((n) => n.includes("NÃO exclui um gap elevado")));
}

function testMaskedHighAnionGapWithNormalPh() {
  // pH/HCO3/pCO2 normais mas AG elevado (alcalose concomitante escondendo AGMA)
  const r = classifyPrimaryDisturbance({ ph: 7.38, pco2: 40, hco3: 24, na: 140, cl: 96 });
  assert.strictEqual(r.ag, 20);
  assert.ok(r.notes.some((n) => n.includes("gap alto mascarado")));
}

function testRequiresPhPco2Hco3() {
  assert.throws(() => classifyPrimaryDisturbance({ ph: 7.4, pco2: 40 }), TypeError);
}

// HCO3 baixo E pCO2 baixo AO MESMO TEMPO (direcoes opostas, nao "mesma
// direcao") e' a assinatura de uma compensacao completa -- em QUALQUER
// sentido. So' o pH decide qual e' o primario; a ordem dos branches no
// codigo NAO pode decidir por inercia (bug real, gestacao: alcalose
// respiratoria cronica fisiologica mal lida como "acidose metabolica com
// compensacao excessiva").
function testOppositeDirectionAlkalemicReadsRespiratoryAlkalosisAsPrimary() {
  const r = classifyPrimaryDisturbance({ ph: 7.46, pco2: 30, hco3: 20, chronicityHint: "chronic" });
  assert.deepStrictEqual(r.primary.map((p) => p.type), ["respiratoryAlkalosis"]);
  assert.strictEqual(r.compensationCheck.for, "respiratoryAlkalosisChronic");
  assert.strictEqual(r.compensationCheck.verdict, "adequado");
}

function testOppositeDirectionAcidemicReadsMetabolicAcidosisAsPrimary() {
  const r = classifyPrimaryDisturbance({ ph: 7.3, pco2: 30, hco3: 20 });
  const types = r.primary.map((p) => p.type);
  assert.strictEqual(types[0], "metabolicAcidosis");
  assert.ok(types.includes("respiratoryAlkalosis"), "pCO2 alem da janela esperada de Winter deve revelar componente alcalinizante adicional");
  assert.strictEqual(r.compensationCheck.for, "metabolicAcidosis");
  assert.strictEqual(r.compensationCheck.verdict, "excessivo");
}

function testOppositeDirectionNormalPhIsHonestlyAmbiguous() {
  const r = classifyPrimaryDisturbance({ ph: 7.45, pco2: 30, hco3: 20 });
  const types = r.primary.map((p) => p.type).sort();
  assert.deepStrictEqual(types, ["metabolicAcidosis", "respiratoryAlkalosis"]);
  assert.strictEqual(r.compensationCheck, null);
  assert.ok(r.notes.some((n) => n.includes("ambíguo")), "pH normal nao deve escolher um primario silenciosamente");
}

// simetrico: HCO3 alto E pCO2 alto ao mesmo tempo (tambem direcoes opostas
// em termos de efeito sobre o pH: HCO3 alto alcaliniza, pCO2 alto acidifica).
function testOppositeDirectionAcidemicReadsRespiratoryAcidosisAsPrimary() {
  const r = classifyPrimaryDisturbance({ ph: 7.34, pco2: 60, hco3: 32, chronicityHint: "chronic" });
  assert.deepStrictEqual(r.primary.map((p) => p.type), ["respiratoryAcidosis"]);
  assert.strictEqual(r.compensationCheck.for, "respiratoryAcidosisChronic");
  assert.strictEqual(r.compensationCheck.verdict, "adequado");
}

function testOppositeDirectionAlkalemicReadsMetabolicAlkalosisAsPrimary() {
  const r = classifyPrimaryDisturbance({ ph: 7.46, pco2: 50, hco3: 35 });
  const types = r.primary.map((p) => p.type);
  assert.strictEqual(types[0], "metabolicAlkalosis");
  assert.ok(types.includes("respiratoryAcidosis"));
  assert.strictEqual(r.compensationCheck.for, "metabolicAlkalosis");
  assert.strictEqual(r.compensationCheck.verdict, "excessivo");
}

function main() {
  testPureMetabolicAcidosisAdequateCompensation();
  testMetabolicAcidosisWithInsufficientRespiratoryCompensation();
  testMetabolicAcidosisWithExcessiveCompensationRevealsAlkalosis();
  testMixedAcidosisNeverReadAsCompensation();
  testMixedAlkalosisNeverReadAsCompensation();
  testRespiratoryAcidosisWithoutChronicityHintShowsBothWindows();
  testRespiratoryAcidosisWithChronicityHintPicksOneWindow();
  testRespiratoryAlkalosisInsufficientRevealsMetabolicAlkalosis();
  testAllNormalNoDisturbance();
  testMaskedHighAnionGapWithNormalPh();
  testRequiresPhPco2Hco3();
  testOppositeDirectionAlkalemicReadsRespiratoryAlkalosisAsPrimary();
  testOppositeDirectionAcidemicReadsMetabolicAcidosisAsPrimary();
  testOppositeDirectionNormalPhIsHonestlyAmbiguous();
  testOppositeDirectionAcidemicReadsRespiratoryAcidosisAsPrimary();
  testOppositeDirectionAlkalemicReadsMetabolicAlkalosisAsPrimary();
  console.log("abg_core tests passed");
}

main();
