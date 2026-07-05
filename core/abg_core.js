"use strict";
/*
 * abg_core.js — motor GERAL de gasometria arterial (nao especifico de CAD).
 *
 * cad_core.js resolve CAD; este modulo resolve o passo anterior e mais amplo:
 * dado pH/pCO2/HCO3 cru, qual e' o(s) disturbio(s) primario(s), a compensacao
 * esperada e' adequada, e ha um segundo processo escondido atras de um pH que
 * parece normal? E' o motor por tras do banco de gasometrias do painel/.
 *
 * Reusa anionGap/correctedAnionGap de cad_core.js (mesma formula, uma fonte —
 * nunca duplicada) para o eixo do gap, quando Na/Cl forem fornecidos.
 *
 * Regra-mae do projeto (CLAUDE.md): numero clinico nasce aqui + em
 * canon/policy.json equivalente; nunca hardcoded em HTML/JS de saida.
 *
 * Tudo dentro de uma IIFE: cad_core.js, carregado antes via <script src> em
 * paginas sem bundler, ja declara varias destas mesmas funcoes (round,
 * anionGap, requiredNumber...) como globais de script classico — sem a IIFE,
 * as declaracoes colidiriam ("Identifier already declared").
 */
(function () {
  // Node/CI usa require; no navegador, cad_core.js ja' deve ter sido carregado
  // antes via <script src> (window.CadCore) -- mesma dependencia, duas formas
  // de resolver, nunca duas copias da formula.
  const CadCore = typeof module !== "undefined" && module.exports
    ? require("./cad_core.js")
    : (typeof window !== "undefined" ? window.CadCore : undefined);
  if (!CadCore) {
    throw new Error("abg_core.js requer cad_core.js carregado antes (window.CadCore ausente)");
  }
  const cadAnionGap = CadCore.anionGap;
  const cadCorrectedAnionGap = CadCore.correctedAnionGap;
  const cadRound = CadCore.round;

  const POLICY = Object.freeze({
    version: "ABG-2026-07-05",
    source:
      "Abordagem stepwise classica (Boston/Narins) para gasometria; formulas de compensacao consistentes com Winter (cad_core.js) para a acidose metabolica.",
    normal: Object.freeze({
      phLow: 7.35,
      phHigh: 7.45,
      pco2Low: 35,
      pco2High: 45,
      hco3Low: 22,
      hco3High: 26,
    }),
    // cada entrada: formula do valor ESPERADO da variavel de compensacao + tolerancia (+-)
    compensation: Object.freeze({
      metabolicAcidosis: Object.freeze({ nome: "Acidose metabólica", eixo: "pco2", formula: "pCO₂ esp = 1,5·HCO₃ + 8", tolerance: 2 }),
      metabolicAlkalosis: Object.freeze({ nome: "Alcalose metabólica", eixo: "pco2", formula: "pCO₂ esp = 0,7·HCO₃ + 21", tolerance: 2 }),
      respiratoryAcidosisAcute: Object.freeze({ nome: "Acidose respiratória aguda", eixo: "hco3", formula: "HCO₃ esp = 24 + 0,1·(pCO₂−40)", tolerance: 2 }),
      respiratoryAcidosisChronic: Object.freeze({ nome: "Acidose respiratória crônica", eixo: "hco3", formula: "HCO₃ esp = 24 + 0,35·(pCO₂−40)", tolerance: 3 }),
      respiratoryAlkalosisAcute: Object.freeze({ nome: "Alcalose respiratória aguda", eixo: "hco3", formula: "HCO₃ esp = 24 − 0,2·(40−pCO₂)", tolerance: 2 }),
      respiratoryAlkalosisChronic: Object.freeze({ nome: "Alcalose respiratória crônica", eixo: "hco3", formula: "HCO₃ esp = 24 − 0,4·(40−pCO₂)", tolerance: 3 }),
    }),
  });

  function requiredNumber(name, value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    return value;
  }
  function isProvided(value) {
    return value != null && !Number.isNaN(value);
  }
  function round(value, decimals = 1) {
    return cadRound(value, decimals);
  }

  function expectedRange(expected, tolerance) {
    return { expected: round(expected, 1), low: round(expected - tolerance, 1), high: round(expected + tolerance, 1) };
  }

  function expectedPco2MetabolicAcidosis(hco3) { return expectedRange(1.5 * hco3 + 8, POLICY.compensation.metabolicAcidosis.tolerance); }
  function expectedPco2MetabolicAlkalosis(hco3) { return expectedRange(0.7 * hco3 + 21, POLICY.compensation.metabolicAlkalosis.tolerance); }
  function expectedHco3RespAcidosisAcute(pco2) { return expectedRange(24 + 0.1 * (pco2 - 40), POLICY.compensation.respiratoryAcidosisAcute.tolerance); }
  function expectedHco3RespAcidosisChronic(pco2) { return expectedRange(24 + 0.35 * (pco2 - 40), POLICY.compensation.respiratoryAcidosisChronic.tolerance); }
  function expectedHco3RespAlkalosisAcute(pco2) { return expectedRange(24 - 0.2 * (40 - pco2), POLICY.compensation.respiratoryAlkalosisAcute.tolerance); }
  function expectedHco3RespAlkalosisChronic(pco2) { return expectedRange(24 - 0.4 * (40 - pco2), POLICY.compensation.respiratoryAlkalosisChronic.tolerance); }

  /*
   * classifyPrimaryDisturbance — diferencial determinístico de gasometria.
   *
   * Entrada: {ph, pco2, hco3} obrigatorios; na, cl, albumin, lactateMmolL,
   * chronicityHint ('acute'|'chronic', so' usado quando o primario e'
   * respiratorio isolado — sem ele, ambas as janelas sao mostradas, honesto
   * sobre a ambiguidade em vez de adivinhar a partir so' dos numeros).
   *
   * Logica (stepwise classico): HCO3 baixo E pCO2 alto SIMULTANEOS nunca e'
   * compensacao (compensacao move a outra variavel na direcao OPOSTA, nunca
   * na mesma) — e' sempre disturbio misto/combinado. Com um so' eixo primario
   * anormal, compara a OUTRA variavel contra a janela esperada: dentro = simples;
   * fora para o lado "insuficiente" = segundo processo na MESMA direcao do pH;
   * fora para o lado "excessivo" = segundo processo na direcao OPOSTA (pode
   * mascarar o pH perto do normal). Retorna sempre os valores computados e o(s)
   * motivo(s) — nunca um veredito unico de caixa-preta.
   */
  function classifyPrimaryDisturbance(input) {
    const ph = requiredNumber("ph", input.ph);
    const pco2 = requiredNumber("pco2", input.pco2);
    const hco3 = requiredNumber("hco3", input.hco3);
    const N = POLICY.normal;

    const acidemia = ph < N.phLow;
    const alkalemia = ph > N.phHigh;
    const phNormal = !acidemia && !alkalemia;

    const metAcidComponent = hco3 < N.hco3Low; // HCO3 baixo -- componente acidificante metabolico
    const metAlkComponent = hco3 > N.hco3High; // HCO3 alto -- componente alcalinizante metabolico
    const respAcidComponent = pco2 > N.pco2High; // pCO2 alto -- componente acidificante respiratorio
    const respAlkComponent = pco2 < N.pco2Low; // pCO2 baixo -- componente alcalinizante respiratorio

    const primary = [];
    const notes = [];
    let compensationCheck = null;

    if (metAcidComponent && respAcidComponent) {
      primary.push({ type: "metabolicAcidosis", reason: `HCO₃ ${hco3} baixo E pCO₂ ${pco2} alto ao mesmo tempo — nunca é compensação (compensação move a outra variável na direção oposta); são dois processos acidificantes independentes.` });
      primary.push({ type: "respiratoryAcidosis", reason: "mesmo raciocínio do item acima — acidose respiratória combinada, não compensação de uma pela outra." });
    } else if (metAlkComponent && respAlkComponent) {
      primary.push({ type: "metabolicAlkalosis", reason: `HCO₃ ${hco3} alto E pCO₂ ${pco2} baixo ao mesmo tempo — dois processos alcalinizantes independentes, não compensação.` });
      primary.push({ type: "respiratoryAlkalosis", reason: "mesmo raciocínio do item acima — alcalose respiratória combinada." });
    } else if (metAcidComponent && respAlkComponent) {
      // HCO3 baixo E pCO2 baixo ao mesmo tempo -- direcoes OPOSTAS (uma
      // acidificante, outra alcalinizante): ao contrario dos dois branches
      // acima, isto e' exatamente a assinatura de uma compensacao completa,
      // em qualquer sentido. So' o pH (nao os dois numeros isolados) decide
      // qual e' o processo primario -- nunca assumir metabolico por inercia
      // da ordem do codigo.
      if (alkalemia) {
        const acute = expectedHco3RespAlkalosisAcute(pco2);
        const chronic = expectedHco3RespAlkalosisChronic(pco2);
        primary.push({ type: "respiratoryAlkalosis", reason: `pH ${ph} alcalêmico com pCO₂ ${pco2} < ${N.pco2Low} — componente respiratório alcalinizante primário; HCO₃ ${hco3} baixo é a resposta renal compensatória na direção oposta, não um segundo processo acidificante.` });
        if (input.chronicityHint === "acute" || input.chronicityHint === "chronic") {
          const exp = input.chronicityHint === "acute" ? acute : chronic;
          const verdict = hco3 < exp.low ? "excessivo" : hco3 > exp.high ? "insuficiente" : "adequado";
          compensationCheck = { for: `respiratoryAlkalosis${input.chronicityHint === "acute" ? "Acute" : "Chronic"}`, measured: hco3, ...exp, verdict };
          if (verdict === "insuficiente") primary.push({ type: "metabolicAlkalosis", reason: `HCO₃ ${hco3} > ${exp.high} (esperado para ${input.chronicityHint === "acute" ? "agudo" : "crônico"}) — componente metabólico alcalinizante adicional.` });
          if (verdict === "excessivo") primary.push({ type: "metabolicAcidosis", reason: `HCO₃ ${hco3} < ${exp.low} — componente metabólico acidificante adicional (a compensação renal deveria reduzir o HCO₃ até esse piso, não além).` });
        } else {
          notes.push(`agudeza não informada — janelas esperadas de HCO₃: agudo ${acute.low}–${acute.high}, crônico ${chronic.low}–${chronic.high}. HCO₃ medido ${hco3}.`);
          compensationCheck = { for: "respiratoryAlkalosis", measured: hco3, acute, chronic };
        }
      } else if (acidemia) {
        const exp = expectedPco2MetabolicAcidosis(hco3);
        const verdict = pco2 < exp.low ? "excessivo" : pco2 > exp.high ? "insuficiente" : "adequado";
        primary.push({ type: "metabolicAcidosis", reason: `pH ${ph} acidêmico com HCO₃ ${hco3} < ${N.hco3Low} — componente metabólico acidificante primário; pCO₂ ${pco2} baixo é a resposta respiratória compensatória (Winter).` });
        compensationCheck = { for: "metabolicAcidosis", measured: pco2, ...exp, verdict };
        if (verdict === "insuficiente") {
          primary.push({ type: "respiratoryAcidosis", reason: `pCO₂ ${pco2} > ${exp.high} (limite superior esperado) — o pulmão não baixou o CO₂ o quanto deveria; componente respiratório acidificante adicional.` });
        } else if (verdict === "excessivo") {
          primary.push({ type: "respiratoryAlkalosis", reason: `pCO₂ ${pco2} < ${exp.low} (limite inferior esperado) — hiperventilação além da compensação prevista; componente respiratório alcalinizante adicional.` });
        }
      } else {
        // pH dentro da faixa normal: os numeros isolados NAO decidem sozinhos
        // qual e' o primario -- as duas leituras sao matematicamente
        // compativeis; mostrar as duas de forma honesta em vez de escolher.
        const expMet = expectedPco2MetabolicAcidosis(hco3);
        const expRespChronic = expectedHco3RespAlkalosisChronic(pco2);
        notes.push(`pH ${ph} normal com HCO₃ ${hco3} baixo E pCO₂ ${pco2} baixo simultaneamente — ambíguo a partir só dos números: compatível com (a) acidose metabólica com compensação respiratória completa (pCO₂ esperado ${expMet.low}–${expMet.high}) OU (b) alcalose respiratória crônica com compensação renal completa (HCO₃ esperado ${expRespChronic.low}–${expRespChronic.high}). Contexto clínico decide qual é o primário, não o número isolado.`);
        primary.push({ type: "metabolicAcidosis", reason: "leitura possível 1: componente metabólico acidificante primário, compensação respiratória completa." });
        primary.push({ type: "respiratoryAlkalosis", reason: "leitura possível 2: componente respiratório alcalinizante primário, compensação renal completa." });
      }
    } else if (metAlkComponent && respAcidComponent) {
      // simetrico ao branch acima: HCO3 alto E pCO2 alto -- direcoes opostas
      // (uma alcalinizante, outra acidificante); pH decide o primario.
      if (acidemia) {
        const acute = expectedHco3RespAcidosisAcute(pco2);
        const chronic = expectedHco3RespAcidosisChronic(pco2);
        primary.push({ type: "respiratoryAcidosis", reason: `pH ${ph} acidêmico com pCO₂ ${pco2} > ${N.pco2High} — componente respiratório acidificante primário; HCO₃ ${hco3} alto é a resposta renal compensatória na direção oposta, não um segundo processo alcalinizante.` });
        if (input.chronicityHint === "acute" || input.chronicityHint === "chronic") {
          const exp = input.chronicityHint === "acute" ? acute : chronic;
          const verdict = hco3 > exp.high ? "excessivo" : hco3 < exp.low ? "insuficiente" : "adequado";
          compensationCheck = { for: `respiratoryAcidosis${input.chronicityHint === "acute" ? "Acute" : "Chronic"}`, measured: hco3, ...exp, verdict };
          if (verdict === "insuficiente") primary.push({ type: "metabolicAcidosis", reason: `HCO₃ ${hco3} < ${exp.low} (esperado para ${input.chronicityHint === "acute" ? "agudo" : "crônico"}) — componente metabólico acidificante adicional.` });
          if (verdict === "excessivo") primary.push({ type: "metabolicAlkalosis", reason: `HCO₃ ${hco3} > ${exp.high} — componente metabólico alcalinizante adicional.` });
        } else {
          notes.push(`agudeza não informada — janelas esperadas de HCO₃: agudo ${acute.low}–${acute.high}, crônico ${chronic.low}–${chronic.high}. HCO₃ medido ${hco3}.`);
          compensationCheck = { for: "respiratoryAcidosis", measured: hco3, acute, chronic };
        }
      } else if (alkalemia) {
        const exp = expectedPco2MetabolicAlkalosis(hco3);
        const verdict = pco2 > exp.high ? "excessivo" : pco2 < exp.low ? "insuficiente" : "adequado";
        primary.push({ type: "metabolicAlkalosis", reason: `pH ${ph} alcalêmico com HCO₃ ${hco3} > ${N.hco3High} — componente metabólico alcalinizante primário; pCO₂ ${pco2} alto é a resposta respiratória compensatória.` });
        compensationCheck = { for: "metabolicAlkalosis", measured: pco2, ...exp, verdict };
        if (verdict === "insuficiente") {
          primary.push({ type: "respiratoryAlkalosis", reason: `pCO₂ ${pco2} < ${exp.low} — o pulmão não reteve CO₂ o quanto deveria; componente respiratório alcalinizante adicional.` });
        } else if (verdict === "excessivo") {
          primary.push({ type: "respiratoryAcidosis", reason: `pCO₂ ${pco2} > ${exp.high} — retenção de CO₂ além da compensação prevista; componente respiratório acidificante adicional.` });
        }
      } else {
        const expMet = expectedPco2MetabolicAlkalosis(hco3);
        const expRespChronic = expectedHco3RespAcidosisChronic(pco2);
        notes.push(`pH ${ph} normal com HCO₃ ${hco3} alto E pCO₂ ${pco2} alto simultaneamente — ambíguo a partir só dos números: compatível com (a) alcalose metabólica com compensação respiratória completa (pCO₂ esperado ${expMet.low}–${expMet.high}) OU (b) acidose respiratória crônica com compensação renal completa (HCO₃ esperado ${expRespChronic.low}–${expRespChronic.high}). Contexto clínico decide qual é o primário, não o número isolado.`);
        primary.push({ type: "metabolicAlkalosis", reason: "leitura possível 1: componente metabólico alcalinizante primário, compensação respiratória completa." });
        primary.push({ type: "respiratoryAcidosis", reason: "leitura possível 2: componente respiratório acidificante primário, compensação renal completa." });
      }
    } else if (metAcidComponent) {
      // HCO3 baixo, pCO2 nao-alto e nao-baixo (dentro da faixa) -> primario metabolico isolado
      const exp = expectedPco2MetabolicAcidosis(hco3);
      const verdict = pco2 < exp.low ? "excessivo" : pco2 > exp.high ? "insuficiente" : "adequado";
      primary.push({ type: "metabolicAcidosis", reason: `HCO₃ ${hco3} < ${N.hco3Low} fecha o componente metabólico acidificante.` });
      compensationCheck = { for: "metabolicAcidosis", measured: pco2, ...exp, verdict };
      if (verdict === "insuficiente") {
        primary.push({ type: "respiratoryAcidosis", reason: `pCO₂ ${pco2} > ${exp.high} (limite superior esperado) — o pulmão não baixou o CO₂ o quanto deveria; componente respiratório acidificante adicional (mesmo que pCO₂ pareça "normal" isoladamente).` });
      } else if (verdict === "excessivo") {
        primary.push({ type: "respiratoryAlkalosis", reason: `pCO₂ ${pco2} < ${exp.low} (limite inferior esperado) — hiperventilação além da compensação prevista; componente respiratório alcalinizante adicional, pode estar mascarando o pH.` });
      }
    } else if (metAlkComponent) {
      const exp = expectedPco2MetabolicAlkalosis(hco3);
      const verdict = pco2 > exp.high ? "excessivo" : pco2 < exp.low ? "insuficiente" : "adequado";
      primary.push({ type: "metabolicAlkalosis", reason: `HCO₃ ${hco3} > ${N.hco3High} fecha o componente metabólico alcalinizante.` });
      compensationCheck = { for: "metabolicAlkalosis", measured: pco2, ...exp, verdict };
      if (verdict === "insuficiente") {
        primary.push({ type: "respiratoryAlkalosis", reason: `pCO₂ ${pco2} < ${exp.low} — o pulmão não reteve CO₂ o quanto deveria; componente respiratório alcalinizante adicional.` });
      } else if (verdict === "excessivo") {
        primary.push({ type: "respiratoryAcidosis", reason: `pCO₂ ${pco2} > ${exp.high} — retenção de CO₂ além da compensação prevista; componente respiratório acidificante adicional.` });
      }
    } else if (respAcidComponent) {
      const acute = expectedHco3RespAcidosisAcute(pco2);
      const chronic = expectedHco3RespAcidosisChronic(pco2);
      primary.push({ type: "respiratoryAcidosis", reason: `pCO₂ ${pco2} > ${N.pco2High} fecha o componente respiratório acidificante.` });
      if (input.chronicityHint === "acute" || input.chronicityHint === "chronic") {
        const exp = input.chronicityHint === "acute" ? acute : chronic;
        const verdict = hco3 > exp.high ? "excessivo" : hco3 < exp.low ? "insuficiente" : "adequado";
        compensationCheck = { for: `respiratoryAcidosis${input.chronicityHint === "acute" ? "Acute" : "Chronic"}`, measured: hco3, ...exp, verdict };
        if (verdict === "insuficiente") primary.push({ type: "metabolicAcidosis", reason: `HCO₃ ${hco3} < ${exp.low} (esperado para ${input.chronicityHint === "acute" ? "agudo" : "crônico"}) — componente metabólico acidificante adicional (a compensação renal deveria elevar o HCO₃, nunca reduzi-lo).` });
        if (verdict === "excessivo") primary.push({ type: "metabolicAlkalosis", reason: `HCO₃ ${hco3} > ${exp.high} — componente metabólico alcalinizante adicional.` });
      } else {
        notes.push(`agudeza não informada — janelas esperadas de HCO₃ calculadas para os dois cenários: agudo ${acute.low}–${acute.high}, crônico ${chronic.low}–${chronic.high}. HCO₃ medido ${hco3}. Sem contexto clínico (tempo de instalação), não adivinhar qual se aplica.`);
        compensationCheck = { for: "respiratoryAcidosis", measured: hco3, acute, chronic };
      }
    } else if (respAlkComponent) {
      const acute = expectedHco3RespAlkalosisAcute(pco2);
      const chronic = expectedHco3RespAlkalosisChronic(pco2);
      primary.push({ type: "respiratoryAlkalosis", reason: `pCO₂ ${pco2} < ${N.pco2Low} fecha o componente respiratório alcalinizante.` });
      if (input.chronicityHint === "acute" || input.chronicityHint === "chronic") {
        const exp = input.chronicityHint === "acute" ? acute : chronic;
        const verdict = hco3 < exp.low ? "excessivo" : hco3 > exp.high ? "insuficiente" : "adequado";
        compensationCheck = { for: `respiratoryAlkalosis${input.chronicityHint === "acute" ? "Acute" : "Chronic"}`, measured: hco3, ...exp, verdict };
        if (verdict === "insuficiente") primary.push({ type: "metabolicAlkalosis", reason: `HCO₃ ${hco3} > ${exp.high} (esperado para ${input.chronicityHint === "acute" ? "agudo" : "crônico"}) — componente metabólico alcalinizante adicional.` });
        if (verdict === "excessivo") primary.push({ type: "metabolicAcidosis", reason: `HCO₃ ${hco3} < ${exp.low} — componente metabólico acidificante adicional (a compensação renal deveria reduzir o HCO₃ até esse piso, não além).` });
      } else {
        notes.push(`agudeza não informada — janelas esperadas de HCO₃: agudo ${acute.low}–${acute.high}, crônico ${chronic.low}–${chronic.high}. HCO₃ medido ${hco3}.`);
        compensationCheck = { for: "respiratoryAlkalosis", measured: hco3, acute, chronic };
      }
    } else {
      // HCO3 e pCO2 ambos dentro da faixa normal
      if (!phNormal) {
        notes.push(`pH ${ph} fora da faixa normal mas HCO₃ e pCO₂ isolados estão dentro da referência — verificar erro pré-analítico/laboratorial ou disturbio misto com componentes que se cancelam perto dos limites de referência.`);
      } else {
        notes.push("HCO₃, pCO₂ e pH dentro da faixa normal por este eixo — isto NÃO exclui um gap elevado mascarado por uma alcalose concomitante; sempre calcular o AG de forma independente.");
      }
    }

    if (phNormal && primary.length) {
      notes.push(`pH ${ph} está dentro da faixa de referência apesar do(s) componente(s) identificado(s) — clássico de disturbio misto com cancelamento parcial; pH normal não significa ausência de doença.`);
    }

    let ag = null, agc = null;
    if (isProvided(input.na) && isProvided(input.cl)) {
      ag = round(cadAnionGap(input.na, input.cl, hco3), 1);
      agc = round(cadCorrectedAnionGap(ag, input.albumin ?? 4.0), 1);
      if (agc > 12 && !metAcidComponent) {
        notes.push(`AGc ${agc} elevado apesar de HCO₃ ${hco3} não estar baixo — gap alto mascarado (provável alcalose ou disturbio misto escondendo a acidose de gap alto; nunca dispense o cálculo do AG só porque o HCO₃ "fechou normal").`);
      }
    }
    if (isProvided(input.lactateMmolL) && input.lactateMmolL >= 2) {
      notes.push(`lactato ${input.lactateMmolL} mmol/L elevado — considerar componente lático no gap, hipoperfusão/sepse, ou artefato de torniquete/exercício antes de assumir cetoacidose isolada.`);
    }

    return {
      ph, pco2, hco3,
      acidemia, alkalemia, phNormal,
      components: { metabolicAcidosis: metAcidComponent, metabolicAlkalosis: metAlkComponent, respiratoryAcidosis: respAcidComponent, respiratoryAlkalosis: respAlkComponent },
      primary,
      compensationCheck,
      ag, agc,
      notes,
    };
  }

  const ABG_CORE_EXPORTS = {
    POLICY,
    round,
    expectedPco2MetabolicAcidosis,
    expectedPco2MetabolicAlkalosis,
    expectedHco3RespAcidosisAcute,
    expectedHco3RespAcidosisChronic,
    expectedHco3RespAlkalosisAcute,
    expectedHco3RespAlkalosisChronic,
    classifyPrimaryDisturbance,
  };

  // UMD minimo, mesmo padrao do cad_core.js: Node/CI usa module.exports; paginas
  // estaticas sem bundler carregam via <script src="../core/abg_core.js"> (depois
  // de cad_core.js, do qual reusa anionGap/correctedAnionGap) e usam window.AbgCore.*
  if (typeof module !== "undefined" && module.exports) {
    module.exports = ABG_CORE_EXPORTS;
  }
  if (typeof window !== "undefined") {
    window.AbgCore = ABG_CORE_EXPORTS;
  }
})();
