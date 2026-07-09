"use strict";
/*
 * check_gasometrias.js — anti-drift do banco de gasometrias em content/gasometrias.json.
 *
 * Mesma filosofia de check_profiles.js, aplicada ao banco de 20 (e crescente)
 * casos de gasometria/bioquímica: nada no gabarito pode ser hand-typed sem
 * bater com o recálculo determinístico. Verifica:
 *
 *   1. estrutura (ids únicos G-NN, confundeCom aponta para ids existentes,
 *      campos obrigatórios presentes, títulos não repetidos);
 *   2. consistência de Henderson-Hasselbalch: pH informado bate com o pH
 *      derivado de HCO3/pCO2 (ph = 6,1 + log10(hco3/(0,03·pco2))) — as três
 *      variáveis nunca são independentes na fisiologia real, e um caso
 *      escrito com as três "escolhidas à mão" sem essa amarra é uma gasometria
 *      que não existe;
 *   3. abg_core.classifyPrimaryDisturbance(labs) recalculado a partir de
 *      "labs" tem que apontar o(s) MESMO(S) distúrbio(s) primário(s) citado(s)
 *      em gabarito.classificacao (por palavra-chave em português);
 *   4. quando labs tem na/cl, o AG (e AGc, quando há albumin) recalculados
 *      aparecem no texto do gabarito (mesmo padrão "near()" de check_profiles.js);
 *   5. quando o caso declara "hasDkaEsperado" (booleano estrutural, não prosa
 *      solta — CAD-família tem eixo glicêmico/cetônico que só cad_core.hasDka()
 *      resolve), cruza contra cad_core.hasDka(labs) de verdade.
 *   6. quiz{mcq,vf,assertivas}: estrutura (mcq com 4 opções, vf com 3 itens,
 *      assertivas com 3 itens/8 opções) e autoconsistência do gabarito — o
 *      índice correto do mcq bate com o título do próprio caso, e o índice
 *      correto das assertivas é recomputado a partir do array "verdades"
 *      (nenhum índice de resposta é hand-typed sem derivação mecânica).
 *
 *   node scripts/check_gasometrias.js
 */
const fs = require("fs");
const path = require("path");
const abg = require("../core/abg_core.js");
const cad = require("../core/cad_core.js");

const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "content/gasometrias.json"), "utf8"));

let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };

const near = (txt, val, tol = 0.05) => {
  const nums = [...txt.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((m) => parseFloat(m[0].replace(",", ".")));
  return nums.some((n) => Math.abs(n - val) <= tol);
};

const TYPE_KEYWORD = {
  metabolicAcidosis: "acidose metabólica",
  metabolicAlkalosis: "alcalose metabólica",
  respiratoryAcidosis: "acidose respiratória",
  respiratoryAlkalosis: "alcalose respiratória",
};

function hh(hco3, pco2) {
  return 6.1 + Math.log10(hco3 / (0.03 * pco2));
}

console.log(`[check_gasometrias] recalculando ${data.casos.length} caso(s) pelo abg_core/cad_core\n`);

const ids = new Set();
const titulos = new Set();

for (const caso of data.casos) {
  const { id, titulo, labs, gabarito, confundeCom } = caso;

  // 1. estrutura
  /^G-\d{2,3}$/.test(id) ? ok(`${id}: id no formato G-NN ou G-NNN`) : bad(`${id}: id fora do formato esperado G-NN ou G-NNN`);
  ids.has(id) ? bad(`${id}: id duplicado`) : ids.add(id);
  titulos.has(titulo) ? bad(`${id}: título duplicado ("${titulo}")`) : titulos.add(titulo);
  typeof caso.mimicsCAD === "boolean" ? ok(`${id}: mimicsCAD é booleano`) : bad(`${id}: mimicsCAD ausente/não-booleano`);
  ["vinheta", "pergunta"].forEach((f) => {
    typeof caso[f] === "string" && caso[f].length > 10 ? null : bad(`${id}: campo "${f}" ausente ou curto demais`);
  });
  ["classificacao", "diagnostico", "raciocinio", "armadilha", "detalheChave", "conteudoComplementar"].forEach((f) => {
    typeof gabarito[f] === "string" && gabarito[f].length > 10 ? null : bad(`${id}: gabarito.${f} ausente ou curto demais`);
  });
  (Array.isArray(confundeCom) && confundeCom.length >= 1) ? null : bad(`${id}: confundeCom deveria ter pelo menos 1 caso relacionado`);

  // 2. Henderson-Hasselbalch
  const phDerivado = hh(labs.hco3, labs.pco2);
  Math.abs(phDerivado - labs.ph) <= 0.02
    ? ok(`${id}: pH ${labs.ph} consistente com Henderson-Hasselbalch (derivado ${phDerivado.toFixed(3)})`)
    : bad(`${id}: pH ${labs.ph} NÃO bate com Henderson-Hasselbalch a partir de HCO₃ ${labs.hco3}/pCO₂ ${labs.pco2} (derivado ${phDerivado.toFixed(3)})`);

  // 3. classificação primária (abg_core)
  const res = abg.classifyPrimaryDisturbance(labs);
  const blob = [gabarito.classificacao, gabarito.diagnostico, gabarito.raciocinio, gabarito.detalheChave].join(" \n ");
  const primaryTypes = res.primary.map((p) => p.type);
  if (primaryTypes.length === 0) {
    ok(`${id}: abg_core não fecha distúrbio primário isolado (esperado para caso de AG mascarado/normal)`);
  } else {
    for (const t of primaryTypes) {
      const kw = TYPE_KEYWORD[t];
      gabarito.classificacao.toLowerCase().includes(kw)
        ? ok(`${id}: "${kw}" (calculado) presente em gabarito.classificacao`)
        : bad(`${id}: abg_core calcula "${t}" mas "${kw}" NÃO aparece em gabarito.classificacao ("${gabarito.classificacao}")`);
    }
  }

  // compensationCheck.expected precisa aparecer em algum lugar do texto
  if (res.compensationCheck && res.compensationCheck.expected != null) {
    near(blob, res.compensationCheck.expected, 0.15) || near(blob, res.compensationCheck.low, 0.15) || near(blob, res.compensationCheck.high, 0.15)
      ? ok(`${id}: janela de compensação esperada (${res.compensationCheck.expected}) rastreável no texto`)
      : bad(`${id}: compensationCheck.expected=${res.compensationCheck.expected} (janela ${res.compensationCheck.low}-${res.compensationCheck.high}) não aparece no gabarito`);
  }

  // 4. AG/AGc
  if (labs.na != null && labs.cl != null) {
    const ag = cad.anionGap(labs.na, labs.cl, labs.hco3);
    near(blob, ag) ? ok(`${id}: AG calculado (${ag}) presente no gabarito`) : bad(`${id}: AG calculado ${ag} NÃO aparece no gabarito`);
    if (labs.albumin != null) {
      const agc = cad.correctedAnionGap(ag, labs.albumin);
      near(blob, agc) ? ok(`${id}: AGc calculado (${agc}) presente no gabarito`) : bad(`${id}: AGc calculado ${agc} NÃO aparece no gabarito`);
    }
  }

  // 5b. quiz (mcq + vf + assertivas) — estrutura e autoconsistência do gabarito
  const quiz = caso.quiz;
  if (!quiz) {
    bad(`${id}: campo "quiz" ausente`);
  } else {
    const mcq = quiz.mcq;
    if (!mcq || !Array.isArray(mcq.opts) || mcq.opts.length !== 4) {
      bad(`${id}: quiz.mcq ausente ou sem exatamente 4 opções`);
    } else {
      Number.isInteger(mcq.correct) && mcq.correct >= 0 && mcq.correct <= 3
        ? ok(`${id}: quiz.mcq.correct é índice válido (0-3)`)
        : bad(`${id}: quiz.mcq.correct=${mcq.correct} fora do intervalo 0-3`);
      mcq.opts[mcq.correct] === titulo
        ? ok(`${id}: quiz.mcq.opts[correct] bate com o título do caso ("${titulo}")`)
        : bad(`${id}: quiz.mcq.opts[correct]="${mcq.opts[mcq.correct]}" NÃO bate com o título do caso ("${titulo}")`);
      if (!(typeof mcq.q === "string" && mcq.q.length > 5 && typeof mcq.exp === "string" && mcq.exp.length > 5)) {
        bad(`${id}: quiz.mcq.q/exp ausente ou curto demais`);
      }
    }

    if (!Array.isArray(quiz.vf) || quiz.vf.length !== 3) {
      bad(`${id}: quiz.vf deveria ter exatamente 3 itens`);
    } else {
      quiz.vf.forEach((item, i) => {
        const valid = item && typeof item === "object"
          && typeof item.q === "string" && item.q.length > 5
          && typeof item.correct === "boolean"
          && typeof item.exp === "string" && item.exp.length > 5;
        if (!valid) bad(`${id}: quiz.vf[${i}] malformado (precisa q/correct(bool)/exp)`);
      });
      ok(`${id}: quiz.vf tem 3 itens estruturalmente válidos`);
    }

    const asrt = quiz.assertivas;
    if (!asrt || !Array.isArray(asrt.itens) || asrt.itens.length !== 3 || !Array.isArray(asrt.verdades) || asrt.verdades.length !== 3 || !Array.isArray(asrt.opcoes) || asrt.opcoes.length !== 8) {
      bad(`${id}: quiz.assertivas malformado (precisa itens[3]/verdades[3]/opcoes[8])`);
    } else {
      const [v1, v2, v3] = asrt.verdades;
      const comboIdx = v1 && !v2 && !v3 ? 0 : !v1 && v2 && !v3 ? 1 : !v1 && !v2 && v3 ? 2
        : v1 && v2 && !v3 ? 3 : v1 && !v2 && v3 ? 4 : !v1 && v2 && v3 ? 5 : v1 && v2 && v3 ? 6 : 7;
      asrt.correta === comboIdx
        ? ok(`${id}: quiz.assertivas.correta (${asrt.correta}) bate com o combo derivado de "verdades" (${JSON.stringify(asrt.verdades)})`)
        : bad(`${id}: quiz.assertivas.correta=${asrt.correta} NÃO bate com o combo derivado de "verdades"=${JSON.stringify(asrt.verdades)} (esperado ${comboIdx})`);
      if (!(typeof asrt.exp === "string" && asrt.exp.length > 5)) {
        bad(`${id}: quiz.assertivas.exp ausente ou curto demais`);
      }
    }
  }

  // 5. hasDkaEsperado (campo estrutural, quando aplicável)
  if (typeof caso.hasDkaEsperado === "boolean") {
    const actual = cad.hasDka({
      knownDiabetes: !!labs.knownDiabetes,
      glucoseMgDl: labs.glucoseMgDl,
      betaHydroxybutyrateMmolL: labs.betaHydroxybutyrateMmolL ?? null,
      ketonuriaCruzes: labs.ketonuriaCruzes ?? null,
      ph: labs.ph,
      hco3: labs.hco3,
    });
    actual === caso.hasDkaEsperado
      ? ok(`${id}: hasDkaEsperado=${caso.hasDkaEsperado} bate com cad_core.hasDka()`)
      : bad(`${id}: hasDkaEsperado=${caso.hasDkaEsperado} MAS cad_core.hasDka() calcula ${actual}`);
  }
}

// confundeCom aponta para ids que de fato existem no banco
for (const caso of data.casos) {
  for (const alvo of caso.confundeCom || []) {
    ids.has(alvo)
      ? null
      : bad(`${caso.id}: confundeCom referencia "${alvo}", que não existe no banco`);
  }
}
ok(`todos os confundeCom referenciam ids existentes (ou falharam acima)`);

console.log("");
if (fails) { console.error(`check_gasometrias: ${fails} FALHA(S).`); process.exit(1); }
console.log(`check_gasometrias: ${data.casos.length} caso(s) batem com abg_core/cad_core (Henderson-Hasselbalch, distúrbio primário, AG/AGc, hasDka).`);
