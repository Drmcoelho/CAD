"use strict";

const POLICY = Object.freeze({
  version: "CAD360-ApA-2026-07-01",
  source:
    "Umpierrez et al. Hyperglycemic Crises in Adults With Diabetes: A Consensus Report. Diabetes Care 2024;47(8):1257-1275.",
  diagnosis: Object.freeze({
    glucoseMgDl: 200,
    betaHydroxybutyrateMmolL: 3.0,
    ph: 7.30,
    bicarbonateMmolL: 18,
  }),
  potassium: Object.freeze({
    replaceBelowMmolL: 5.0,
    targetLowMmolL: 4.0,
    targetHighMmolL: 5.0,
    holdInsulinBelowMmolL: 3.5,
  }),
  bicarbonate: Object.freeze({
    considerBelowPh: 7.0,
  }),
  phosphate: Object.freeze({
    considerBelowMmolL: 1.0,
  }),
  insulin: Object.freeze({
    initialUnitsKgHour: 0.1,
    reducedUnitsKgHour: 0.05,
    reduceGlucoseBelowMgDl: 250,
  }),
  resolution: Object.freeze({
    betaHydroxybutyrateBelowMmolL: 0.6,
    phAtLeast: 7.3,
    bicarbonateAtLeastMmolL: 18,
  }),
  sodiumCorrection: Object.freeze({
    factorDefault: 1.6,
    factorSevereHyperglycemia: 2.4,
    severeHyperglycemiaAboveMgDl: 400,
  }),
});

function requiredNumber(name, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function isProvided(value) {
  return value !== undefined && value !== null;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function anionGap(na, cl, hco3) {
  return requiredNumber("na", na) - (requiredNumber("cl", cl) + requiredNumber("hco3", hco3));
}

function correctedAnionGap(ag, albumin = 4.0) {
  return requiredNumber("ag", ag) + 2.5 * (4.0 - requiredNumber("albumin", albumin));
}

function deltaRatio(agc, hco3) {
  const denominator = 24 - requiredNumber("hco3", hco3);
  if (denominator === 0) {
    throw new RangeError("deltaRatio denominator is zero when HCO3 equals 24");
  }
  return (requiredNumber("agc", agc) - 12) / denominator;
}

function interpretDeltaRatio(value) {
  const ratio = requiredNumber("deltaRatio", value);
  if (ratio < 1) {
    return {
      band: "<1",
      label: "AGMA + cauda hipercloremica/NAGMA",
      decision: "nao chamar de pura; procurar cloro/perda de HCO3 e tendencia temporal",
    };
  }
  if (ratio <= 2) {
    return {
      band: "1-2",
      label: "AGMA de gap alto mais limpa",
      decision: "padrao esperado de cetoacidose sem mistura metabolica dominante",
    };
  }
  return {
    band: ">2",
    label: "alcalose metabolica associada ou HCO3 previo alto",
    decision: "procurar vomitos, diuretico, contracao ou bicarbonato previo",
  };
}

function winter(hco3) {
  const expected = 1.5 * requiredNumber("hco3", hco3) + 8;
  return { expected, low: expected - 2, high: expected + 2 };
}

function sodiumCorrectionFactor(glucoseMgDl) {
  const glucose = requiredNumber("glucoseMgDl", glucoseMgDl);
  return glucose > POLICY.sodiumCorrection.severeHyperglycemiaAboveMgDl
    ? POLICY.sodiumCorrection.factorSevereHyperglycemia
    : POLICY.sodiumCorrection.factorDefault;
}

function correctedSodium(na, glucoseMgDl, factor = sodiumCorrectionFactor(glucoseMgDl)) {
  return requiredNumber("na", na) + requiredNumber("factor", factor) * ((requiredNumber("glucoseMgDl", glucoseMgDl) - 100) / 100);
}

function effectiveOsmolality(na, glucoseMgDl) {
  return 2 * requiredNumber("na", na) + requiredNumber("glucoseMgDl", glucoseMgDl) / 18;
}

function totalCalculatedOsmolality({ na, glucoseMgDl, bunMgDl = null, ureaMgDl = null }) {
  const effective = effectiveOsmolality(na, glucoseMgDl);
  if (bunMgDl != null) {
    return effective + requiredNumber("bunMgDl", bunMgDl) / 2.8;
  }
  if (ureaMgDl != null) {
    return effective + requiredNumber("ureaMgDl", ureaMgDl) / 6;
  }
  return effective;
}

function potassiumPlan(kMmolL) {
  const k = requiredNumber("kMmolL", kMmolL);
  if (k < POLICY.potassium.holdInsulinBelowMmolL) {
    return {
      band: "<3.5",
      insulin: "hold",
      potassium: "replace before insulin; monitor closely",
      target: "4-5 mmol/L",
    };
  }
  if (k < POLICY.potassium.replaceBelowMmolL) {
    return {
      band: "3.5-5.0",
      insulin: "allowed",
      potassium: "replace to maintain 4-5 mmol/L",
      target: "4-5 mmol/L",
    };
  }
  return {
    band: ">=5.0",
    insulin: "allowed",
    potassium: "no initial potassium; ECG/recheck",
    target: "4-5 mmol/L",
  };
}

function insulinPlan({ kMmolL, glucoseMgDl }) {
  const kPlan = potassiumPlan(kMmolL);
  if (kPlan.insulin === "hold") {
    return {
      rateUnitsKgHour: 0,
      action: "hold insulin until K >= 3.5",
      dextrose: false,
      potassium: kPlan,
    };
  }
  const glucose = requiredNumber("glucoseMgDl", glucoseMgDl);
  const dextrose = glucose < POLICY.insulin.reduceGlucoseBelowMgDl;
  return {
    rateUnitsKgHour: dextrose ? POLICY.insulin.reducedUnitsKgHour : POLICY.insulin.initialUnitsKgHour,
    action: dextrose ? "continue insulin with dextrose" : "start fixed-rate insulin",
    dextrose,
    potassium: kPlan,
  };
}

function hasDka({ knownDiabetes = false, glucoseMgDl, betaHydroxybutyrateMmolL, ph = null, hco3 = null }) {
  const glucoseAxis = knownDiabetes || requiredNumber("glucoseMgDl", glucoseMgDl) >= POLICY.diagnosis.glucoseMgDl;
  const ketoneAxis =
    requiredNumber("betaHydroxybutyrateMmolL", betaHydroxybutyrateMmolL) >=
    POLICY.diagnosis.betaHydroxybutyrateMmolL;
  // Eixo acido e um OR (pH <7,30 e/ou HCO3 <18): basta um dos dois estar disponivel;
  // exigir ambos rejeitaria uma VBG so com pH, ou uma bioquimica so com HCO3.
  if (!isProvided(ph) && !isProvided(hco3)) {
    throw new TypeError("hasDka requires at least one of ph or hco3");
  }
  let acidAxis = false;
  if (isProvided(ph)) acidAxis = acidAxis || requiredNumber("ph", ph) < POLICY.diagnosis.ph;
  if (isProvided(hco3)) acidAxis = acidAxis || requiredNumber("hco3", hco3) < POLICY.diagnosis.bicarbonateMmolL;
  return glucoseAxis && ketoneAxis && acidAxis;
}

function isResolvedDka({ betaHydroxybutyrateMmolL, ph = null, hco3 = null }) {
  const ketoneResolved =
    requiredNumber("betaHydroxybutyrateMmolL", betaHydroxybutyrateMmolL) <
    POLICY.resolution.betaHydroxybutyrateBelowMmolL;
  // Mesma logica de OR do diagnostico: a resolucao acida pode ser lida por pH OU HCO3.
  if (!isProvided(ph) && !isProvided(hco3)) {
    throw new TypeError("isResolvedDka requires at least one of ph or hco3");
  }
  let acidResolved = false;
  if (isProvided(ph)) acidResolved = acidResolved || requiredNumber("ph", ph) >= POLICY.resolution.phAtLeast;
  if (isProvided(hco3)) acidResolved = acidResolved || requiredNumber("hco3", hco3) >= POLICY.resolution.bicarbonateAtLeastMmolL;
  return ketoneResolved && acidResolved;
}

module.exports = {
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
};
