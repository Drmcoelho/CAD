"use strict";

const POLICY = Object.freeze({
  version: "CAD360-ApA-2026-07-01",
  source:
    "Umpierrez et al. Hyperglycemic Crises in Adults With Diabetes: A Consensus Report. Diabetes Care 2024;47(8):1257-1275.",
  diagnosis: Object.freeze({
    glucoseMgDl: 200,
    betaHydroxybutyrateMmolL: 3.0,
    // eixo cetonico alternativo: na pratica clinica brasileira, beta-HB serico
    // point-of-care e raro; a fita de cetonuria (cruzes) e o que existe de fato.
    // Mede acetoacetato, nao beta-HB -- serve para DIAGNOSTICO (doutrina: "ou
    // cetonuria >=2+"), mas NAO para RESOLUCAO (acetoacetato pode subir durante
    // o tratamento enquanto o beta-HB cai -- ver resolution.* abaixo).
    ketonuriaCruzesAtLeast: 2,
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

function hasDka({ knownDiabetes = false, glucoseMgDl, betaHydroxybutyrateMmolL = null, ketonuriaCruzes = null, ph = null, hco3 = null }) {
  const glucoseAxis = knownDiabetes || requiredNumber("glucoseMgDl", glucoseMgDl) >= POLICY.diagnosis.glucoseMgDl;
  // Eixo cetonico e um OR: beta-HB serico >=3,0 OU cetonuria (cruzes) >=2+ (doutrina
  // 2024). Na pratica brasileira, cetonuria e o que existe de fato; beta-HB e
  // aceito quando disponivel. Exigir os dois rejeitaria o caso comum (so cruzes).
  if (!isProvided(betaHydroxybutyrateMmolL) && !isProvided(ketonuriaCruzes)) {
    throw new TypeError("hasDka requires at least one of betaHydroxybutyrateMmolL or ketonuriaCruzes");
  }
  let ketoneAxis = false;
  if (isProvided(betaHydroxybutyrateMmolL)) {
    ketoneAxis = ketoneAxis || requiredNumber("betaHydroxybutyrateMmolL", betaHydroxybutyrateMmolL) >= POLICY.diagnosis.betaHydroxybutyrateMmolL;
  }
  if (isProvided(ketonuriaCruzes)) {
    ketoneAxis = ketoneAxis || requiredNumber("ketonuriaCruzes", ketonuriaCruzes) >= POLICY.diagnosis.ketonuriaCruzesAtLeast;
  }
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

// isResolvedDka EXIGE beta-HB serico -- decisao deliberada, nao esquecimento.
// Cetonuria (cruzes) mede acetoacetato, e o acetoacetato pode SUBIR durante o
// tratamento enquanto o beta-HB (o cetoacido predominante na CAD) cai -- usar
// cetonuria para dizer "resolvido" seria ativamente enganoso. Sem beta-HB
// serico nao ha como confirmar resolucao por este eixo; classifyDkaProfile()
// trata esse caso como incerteza explicita, nao como falha silenciosa.
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

/*
 * classifyDkaProfile — diferencial de perfil de CAD a partir de labs.
 *
 * NAO substitui julgamento clinico: devolve uma lista RANQUEADA de perfis
 * plausiveis com o motivo de cada um (mesmo espirito do restante do core —
 * numero clinico decide, nunca uma caixa-preta). Perfis correspondem aos ids
 * de content/profiles.json; a UI resolve o id para o link/ancora.
 *
 * Entrada minima: na, cl, hco3, glucoseMgDl, betaHydroxybutyrateMmolL, ph.
 * Opcionais: albumin (default 4.0), kMmolL, lactateMmolL, knownDiabetes,
 * suspectedSepsis (flag de contexto quando o lactato nao foi medido),
 * dialysisDependent (DRC dialitica — sem clearance renal de glicose/K, a
 * heuristica usual de glicose/osm para euglicemica/cad-hhs nao se aplica;
 * aponta direto para o perfil "dialitica" quando hasDka() fecha).
 * Se faltar algo essencial, devolve {insufficient:true, missing:[...]}.
 */
function classifyDkaProfile(input) {
  const req = ["na", "cl", "hco3", "glucoseMgDl", "ph"];
  const missing = req.filter((k) => input[k] == null || Number.isNaN(input[k]));
  const hasBhb = input.betaHydroxybutyrateMmolL != null && !Number.isNaN(input.betaHydroxybutyrateMmolL);
  const hasCruzes = input.ketonuriaCruzes != null && !Number.isNaN(input.ketonuriaCruzes);
  if (!hasBhb && !hasCruzes) missing.push("betaHydroxybutyrateMmolL|ketonuriaCruzes");
  if (missing.length) return { insufficient: true, missing };

  const { na, cl, hco3, glucoseMgDl: glu, ph } = input;
  const bhb = hasBhb ? input.betaHydroxybutyrateMmolL : null;
  const cruzes = hasCruzes ? input.ketonuriaCruzes : null;
  const albumin = input.albumin ?? 4.0;
  const knownDiabetes = !!input.knownDiabetes;
  const lactate = input.lactateMmolL ?? null;
  const suspectedSepsis = !!input.suspectedSepsis;
  const dialysisDependent = !!input.dialysisDependent;

  const ag = anionGap(na, cl, hco3);
  const agc = correctedAnionGap(ag, albumin);
  const dd = hco3 !== 24 ? deltaRatio(agc, hco3) : null;
  const ddBand = dd != null ? interpretDeltaRatio(dd) : null;
  const osmEff = effectiveOsmolality(na, glu);
  const dka = hasDka({ knownDiabetes, glucoseMgDl: glu, betaHydroxybutyrateMmolL: bhb, ketonuriaCruzes: cruzes, ph, hco3 });
  // resolucao exige beta-HB serico (cetonuria nao confirma resolucao — ver isResolvedDka);
  // sem beta-HB, resolved fica null (incerto), nao false.
  const resolved = hasBhb ? isResolvedDka({ betaHydroxybutyrateMmolL: bhb, ph, hco3 }) : null;
  const ketoneAxis = (bhb != null && bhb >= POLICY.diagnosis.betaHydroxybutyrateMmolL) || (cruzes != null && cruzes >= POLICY.diagnosis.ketonuriaCruzesAtLeast);
  const acidAxis = ph < POLICY.diagnosis.ph || hco3 < POLICY.diagnosis.bicarbonateMmolL;
  const ketoneNote = hasBhb ? `βHB ${bhb}` : `cetonúria ${cruzes}+`;

  const matches = [];
  const add = (id, reason) => matches.push({ id, reason });

  if (!knownDiabetes && glu < POLICY.diagnosis.glucoseMgDl && ketoneAxis) {
    add("alcoolica-jejum", `cetose real (${ketoneNote}), mas o eixo glicêmico do critério formal não fecha (não-diabético + glicose <200) — não é CAD diabética.`);
  } else if (!dka && ketoneAxis && !acidAxis) {
    add("pre-cad", `${ketoneNote} já cruza o limiar cetônico, mas pH e HCO₃ ainda dentro do critério — fase pré-acidose (tampão ainda segura).`);
  } else if (!dka && !ketoneAxis && acidAxis) {
    if (resolved === true) {
      add("hipercloremica", "cetose já abaixo do limiar e resolução formal atingida (pH ou HCO₃ na meta), mas HCO₃ ainda baixo — provável cauda hiperclorêmica, não CAD ativa.");
    } else if (resolved === false) {
      add("parcial", "cetose abaixo do limiar diagnóstico mas resolução ainda não atingida — zona de trânsito (nem CAD nova, nem resolvida).");
    } else {
      // sem beta-HB serico nao da para distinguir com seguranca; cetonuria NAO
      // confirma resolucao (acetoacetato pode subir com o tratamento) — mostra
      // as duas hipoteses com a ressalva, em vez de escolher uma calada.
      add("parcial", "cetose (cruzes) abaixo do limiar diagnóstico, com acidose residual — pode ser cetose ainda em resolução...");
      add("hipercloremica", "...OU cauda hiperclorêmica já instalada. A distinção exige β-HB sérico: cetonúria não confirma resolução (acetoacetato pode subir durante o tratamento mesmo com a cetose resolvendo).");
    }
  } else if (dka) {
    if (dialysisDependent) {
      add("dialitica", "DRC dialítica — sem clearance renal, a glicose não tem via de escape (diurese osmótica) e o K carece de via de excreção; volume/K/ácido-base seguem lógica distinta da CAD com função renal preservada.");
      if (osmEff > 300) {
        matches.push({ id: null, reason: `osm efetiva ${round(osmEff, 1)} > 300 — território hiperosmolar acentuado pela ausência de clearance renal de glicose, não necessariamente sobreposição do fenótipo CAD+HHS.` });
      }
    } else {
      if (glu < POLICY.insulin.reduceGlucoseBelowMgDl) add("euglicemica", `glicose ${glu} < ${POLICY.insulin.reduceGlucoseBelowMgDl} apesar de hasDka() verdadeiro — fenótipo euglicêmico (SGLT2i/jejum/gestação/etilismo).`);
      if (glu >= 500 || osmEff > 300) add("cad-hhs", `glicose muito alta${osmEff > 300 ? ` e osm efetiva ${round(osmEff, 1)} > 300` : ""} — considerar sobreposição com HHS.`);
    }
    if ((lactate != null && lactate >= 4) || suspectedSepsis) add("sepse-lactato", "lactato elevado e/ou contexto séptico — acidose provavelmente mista (cetona + lactato).");
    if (!matches.length) add("classica", "critério de CAD fechado (hasDka verdadeiro), sem sinal específico de outro fenótipo — apresentação clássica.");
  }

  if (ddBand && ddBand.band === "<1" && !matches.some((m) => m.id === "hipercloremica")) {
    matches.push({ id: null, reason: `Δ/Δ ${round(dd, 2)} <1 — componente hiperclorêmico associado, independente do perfil principal.` });
  }

  return {
    insufficient: false,
    computed: {
      ag: round(ag, 1), agc: round(agc, 1), deltaRatio: dd != null ? round(dd, 2) : null, deltaBand: ddBand ? ddBand.band : null,
      effectiveOsmolality: round(osmEff, 1), hasDka: dka, isResolvedDka: resolved,
      ketoneMarker: hasBhb ? "betaHB" : "cetonuriaCruzes",
    },
    matches,
  };
}

const CAD_CORE_EXPORTS = {
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
  classifyDkaProfile,
};

// UMD minimo: Node/CI usa module.exports (require); paginas estaticas sem
// bundler (perfis/, futuras) carregam via <script src="../core/cad_core.js">
// e usam window.CadCore.* — mesmas formulas, uma fonte, sem duplicar.
if (typeof module !== "undefined" && module.exports) {
  module.exports = CAD_CORE_EXPORTS;
}
if (typeof window !== "undefined") {
  window.CadCore = CAD_CORE_EXPORTS;
}
