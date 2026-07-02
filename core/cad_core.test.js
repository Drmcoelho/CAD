"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  POLICY,
  round,
  anionGap,
  correctedAnionGap,
  deltaRatio,
  interpretDeltaRatio,
  winter,
  sodiumCorrectionFactor,
  correctedSodium,
  effectiveOsmolality,
  totalCalculatedOsmolality,
  potassiumPlan,
  insulinPlan,
  hasDka,
  isResolvedDka,
} = require("../core/cad_core");

const SOURCE = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../pranchas/lote1/source/cad_lote1_source.json"), "utf8")
);

function near(actual, expected, tolerance = 0.05, label = "value") {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`
  );
}

function testCalculators() {
  const ag = anionGap(135, 99, 11);
  near(ag, 25, 0.001, "AG");

  const agc = correctedAnionGap(ag, 2.8);
  near(agc, 28, 0.001, "AGc");

  const dd = deltaRatio(agc, 11);
  near(dd, 1.23, 0.01, "delta ratio");
  assert.strictEqual(interpretDeltaRatio(dd).band, "1-2");

  const w = winter(11);
  near(w.expected, 24.5, 0.001, "Winter expected");
  near(w.low, 22.5, 0.001, "Winter low");
  near(w.high, 26.5, 0.001, "Winter high");

  near(effectiveOsmolality(135, 320), 287.78, 0.01, "effective osmolality");
}

function testDelta071() {
  const dd = deltaRatio(22, 10);
  near(dd, 0.71, 0.01, "delta 0.71");
  const interpretation = interpretDeltaRatio(dd);
  assert.strictEqual(interpretation.band, "<1");
  assert.match(interpretation.label, /hipercloremica/);
}

function testOsmolalitySeparation() {
  const effective = effectiveOsmolality(136, 360);
  const total = totalCalculatedOsmolality({ na: 136, glucoseMgDl: 360, bunMgDl: 42 });
  near(effective, 292, 0.001, "effective osm");
  near(total, 307, 0.001, "total calculated osm");
  assert.ok(total > effective, "BUN must only increase total/osm-gap calculation");
}

function testCorrectedSodium() {
  assert.strictEqual(sodiumCorrectionFactor(360), 1.6);
  assert.strictEqual(sodiumCorrectionFactor(600), 2.4);
  near(correctedSodium(130, 600), 142, 0.001, "corrected Na severe hyperglycemia");
}

function testPotassiumPolicy() {
  assert.strictEqual(POLICY.potassium.replaceBelowMmolL, 5.0);
  assert.strictEqual(POLICY.potassium.holdInsulinBelowMmolL, 3.5);

  assert.strictEqual(potassiumPlan(3.2).insulin, "hold");
  assert.strictEqual(potassiumPlan(4.1).band, "3.5-5.0");
  assert.strictEqual(potassiumPlan(5.2).band, ">=5.0");

  assert.strictEqual(insulinPlan({ kMmolL: 3.2, glucoseMgDl: 300 }).rateUnitsKgHour, 0);
  assert.strictEqual(insulinPlan({ kMmolL: 4.1, glucoseMgDl: 300 }).rateUnitsKgHour, 0.1);
  assert.strictEqual(insulinPlan({ kMmolL: 4.1, glucoseMgDl: 138 }).rateUnitsKgHour, 0.05);
  assert.strictEqual(insulinPlan({ kMmolL: 4.1, glucoseMgDl: 138 }).dextrose, true);
}

function testDiagnosisAndResolution() {
  assert.strictEqual(
    hasDka({
      knownDiabetes: true,
      glucoseMgDl: 138,
      betaHydroxybutyrateMmolL: 5.8,
      ph: 7.22,
      hco3: 9,
    }),
    true
  );

  assert.strictEqual(
    isResolvedDka({
      betaHydroxybutyrateMmolL: 0.5,
      ph: 7.31,
      hco3: 16,
    }),
    true
  );

  assert.strictEqual(
    isResolvedDka({
      betaHydroxybutyrateMmolL: 1.2,
      ph: 7.31,
      hco3: 18,
    }),
    false
  );

  // eixo acido e um OR: um so marcador (VBG so com pH, ou bioquimica so com HCO3) basta.
  assert.strictEqual(
    hasDka({ knownDiabetes: true, glucoseMgDl: 138, betaHydroxybutyrateMmolL: 5.8, ph: 7.22 }),
    true
  );
  assert.strictEqual(
    hasDka({ knownDiabetes: true, glucoseMgDl: 138, betaHydroxybutyrateMmolL: 5.8, hco3: 9 }),
    true
  );
  // um eixo acido normal (sem o outro) nao fecha CAD
  assert.strictEqual(
    hasDka({ knownDiabetes: true, glucoseMgDl: 138, betaHydroxybutyrateMmolL: 5.8, hco3: 20 }),
    false
  );
  // resolucao lida por um unico eixo
  assert.strictEqual(isResolvedDka({ betaHydroxybutyrateMmolL: 0.5, hco3: 18 }), true);
  assert.strictEqual(isResolvedDka({ betaHydroxybutyrateMmolL: 0.5, ph: 7.31 }), true);
  // mas faltar AMBOS os eixos acidos e erro claro, nao silencio
  assert.throws(
    () => hasDka({ knownDiabetes: true, glucoseMgDl: 138, betaHydroxybutyrateMmolL: 5.8 }),
    /at least one of ph or hco3/
  );
  assert.throws(
    () => isResolvedDka({ betaHydroxybutyrateMmolL: 0.5 }),
    /at least one of ph or hco3/
  );
}

function testSourceAndCorePolicyDoNotDrift() {
  assert.strictEqual(SOURCE.clinical_policy.potassium.replace_when_below, POLICY.potassium.replaceBelowMmolL);
  assert.strictEqual(SOURCE.clinical_policy.potassium.hold_insulin_below, POLICY.potassium.holdInsulinBelowMmolL);
  assert.strictEqual(
    SOURCE.clinical_policy.sodium_correction.default_factor,
    POLICY.sodiumCorrection.factorDefault
  );
  assert.strictEqual(
    SOURCE.clinical_policy.sodium_correction.severe_hyperglycemia_factor,
    POLICY.sodiumCorrection.factorSevereHyperglycemia
  );
  assert.deepStrictEqual(
    SOURCE.clinical_policy.delta_ratio.canon.map((item) => item.range),
    ["< 1", "1-2", "> 2"]
  );
}

function main() {
  testCalculators();
  testDelta071();
  testOsmolalitySeparation();
  testCorrectedSodium();
  testPotassiumPolicy();
  testDiagnosisAndResolution();
  testSourceAndCorePolicyDoNotDrift();
  console.log("cad_core tests passed", round(effectiveOsmolality(136, 360), 1));
}

main();
