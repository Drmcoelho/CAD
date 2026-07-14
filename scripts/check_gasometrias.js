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
 *   6. quiz{mcq[],vf[],assertivas[]}: estrutura (cada mcq com 4 opções, vf
 *      sempre 3 itens, cada assertivas com 3 itens/8 opções) e autoconsistência
 *      do gabarito — o índice correto do mcq[0] bate com o título do próprio
 *      caso, e o índice correto de cada assertivas é recomputado a partir do
 *      array "verdades" (nenhum índice de resposta é hand-typed sem derivação
 *      mecânica). Formato novo (rollout): quiz.mcq como array de 8 marca um
 *      caso migrado — exige também quiz.assertivas com 3 blocos e "evolucao"
 *      (pontos[1-3] com pH derivado por Henderson-Hasselbalch + escada de 8
 *      passos socráticos + casosRelacionados), e barra vinheta/pergunta que
 *      citem outro caso (G-NN) antes do reveal (spoiler). Formato antigo
 *      (objeto único em mcq/assertivas, sem evolucao) ainda tolerado até o
 *      lote inteiro (100 casos) ser convertido.
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
    let agc = ag;
    if (labs.albumin != null) {
      agc = cad.correctedAnionGap(ag, labs.albumin);
      near(blob, agc) ? ok(`${id}: AGc calculado (${agc}) presente no gabarito`) : bad(`${id}: AGc calculado ${agc} NÃO aparece no gabarito`);
    }

    // 4b. Δ/Δ = (AGc-12)/(24-HCO3) — cruza a zona (<1 hiperclorêmica / 1-2 pura / >2 alcalose)
    // contra as palavras-chave "pura"/"hiperclorêmica"/"alcalose" no texto, quando o gabarito
    // faz essa afirmação (armadilha histórica do repo: "0,93 quase pura" — ver CLAUDE.md).
    if (24 - labs.hco3 !== 0) {
      const dd = (agc - 12) / (24 - labs.hco3);
      const zone = dd < 1 ? "hiperclorêmica" : dd <= 2 ? "pura" : "alcalose";
      const claimsPura = /agma pura|gap alto explica sozinho|sem cauda|não há cauda|explica sozinh/i.test(blob);
      const claimsHypercl = /cauda hiperclor|componente hiperclor/i.test(blob);
      const claimsAlcalose = /alcalose.{0,20}(somad|associad)/i.test(blob);
      if (claimsPura && zone !== "pura") {
        bad(`${id}: gabarito afirma AGMA "pura" mas Δ/Δ calculado = ${dd.toFixed(2)} (zona: ${zone}, não pura)`);
      } else if (claimsHypercl && zone === "pura") {
        bad(`${id}: gabarito afirma componente hiperclorêmico mas Δ/Δ calculado = ${dd.toFixed(2)} (zona: pura, sem cauda)`);
      } else if (claimsAlcalose && zone !== "alcalose") {
        bad(`${id}: gabarito afirma alcalose associada mas Δ/Δ calculado = ${dd.toFixed(2)} (zona: ${zone})`);
      } else if (claimsPura || claimsHypercl || claimsAlcalose) {
        ok(`${id}: Δ/Δ calculado (${dd.toFixed(2)}, zona ${zone}) consistente com a zona afirmada no gabarito`);
      }
    }
  }

  // 5b. quiz (mcq[]/vf[]/assertivas[]) + evolucao (série temporal + escada de 8 passos)
  // Rollout em andamento: quiz.mcq como array marca um caso já convertido pro formato
  // novo (8 mcq / 3 assertivas / evolucao obrigatória); objeto único = formato antigo,
  // ainda tolerado até o lote inteiro (100 casos) ser migrado.
  const quiz = caso.quiz;
  if (!quiz) {
    bad(`${id}: campo "quiz" ausente`);
  } else {
    const upgraded = Array.isArray(quiz.mcq);
    const mcqArr = upgraded ? quiz.mcq : quiz.mcq ? [quiz.mcq] : [];

    if (mcqArr.length === 0) {
      bad(`${id}: quiz.mcq ausente`);
    } else {
      mcqArr.forEach((mcq, mi) => {
        if (!mcq || !Array.isArray(mcq.opts) || mcq.opts.length !== 4) {
          bad(`${id}: quiz.mcq[${mi}] ausente ou sem exatamente 4 opções`);
          return;
        }
        if (!(Number.isInteger(mcq.correct) && mcq.correct >= 0 && mcq.correct <= 3)) {
          bad(`${id}: quiz.mcq[${mi}].correct=${mcq.correct} fora do intervalo 0-3`);
        }
        if (mi === 0 && mcq.opts[mcq.correct] !== titulo) {
          bad(`${id}: quiz.mcq[0].opts[correct]="${mcq.opts[mcq.correct]}" NÃO bate com o título do caso ("${titulo}")`);
        }
        if (!(typeof mcq.q === "string" && mcq.q.length > 5 && typeof mcq.exp === "string" && mcq.exp.length > 5)) {
          bad(`${id}: quiz.mcq[${mi}].q/exp ausente ou curto demais`);
        }
      });
      if (upgraded && mcqArr.length !== 8) bad(`${id}: quiz.mcq deveria ter 8 itens (formato novo), tem ${mcqArr.length}`);
      ok(`${id}: quiz.mcq (${mcqArr.length} item(ns)) estruturalmente válido`);
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

    const asrtArr = Array.isArray(quiz.assertivas) ? quiz.assertivas : quiz.assertivas ? [quiz.assertivas] : [];
    if (asrtArr.length === 0) {
      bad(`${id}: quiz.assertivas ausente`);
    } else {
      asrtArr.forEach((asrt, ai) => {
        if (!asrt || !Array.isArray(asrt.itens) || asrt.itens.length !== 3 || !Array.isArray(asrt.verdades) || asrt.verdades.length !== 3 || !Array.isArray(asrt.opcoes) || asrt.opcoes.length !== 8) {
          bad(`${id}: quiz.assertivas[${ai}] malformado (precisa itens[3]/verdades[3]/opcoes[8])`);
          return;
        }
        const [v1, v2, v3] = asrt.verdades;
        const comboIdx = v1 && !v2 && !v3 ? 0 : !v1 && v2 && !v3 ? 1 : !v1 && !v2 && v3 ? 2
          : v1 && v2 && !v3 ? 3 : v1 && !v2 && v3 ? 4 : !v1 && v2 && v3 ? 5 : v1 && v2 && v3 ? 6 : 7;
        if (asrt.correta !== comboIdx) {
          bad(`${id}: quiz.assertivas[${ai}].correta=${asrt.correta} NÃO bate com o combo derivado de "verdades"=${JSON.stringify(asrt.verdades)} (esperado ${comboIdx})`);
        }
        if (!(typeof asrt.exp === "string" && asrt.exp.length > 5)) {
          bad(`${id}: quiz.assertivas[${ai}].exp ausente ou curto demais`);
        }
      });
      if (upgraded && asrtArr.length !== 3) bad(`${id}: quiz.assertivas deveria ter 3 blocos (formato novo), tem ${asrtArr.length}`);
      ok(`${id}: quiz.assertivas (${asrtArr.length} bloco(s)) estruturalmente válido`);
    }

    // evolucao: obrigatória só para casos já migrados pro formato novo (upgraded)
    if (upgraded) {
      const ev = caso.evolucao;
      if (!ev || !Array.isArray(ev.pontos) || ev.pontos.length < 1 || ev.pontos.length > 3
        || !Array.isArray(ev.escada) || ev.escada.length !== 8
        || typeof ev.casosRelacionados !== "string" || ev.casosRelacionados.length < 20) {
        bad(`${id}: evolucao ausente ou malformada (precisa pontos[1-3]/escada[8]/casosRelacionados)`);
      } else {
        ev.pontos.forEach((p, pi) => {
          if (!p.labs || p.labs.hco3 == null || p.labs.pco2 == null || p.labs.ph == null) {
            bad(`${id}: evolucao.pontos[${pi}] sem ph/pco2/hco3`);
            return;
          }
          const phDerivado = hh(p.labs.hco3, p.labs.pco2);
          Math.abs(phDerivado - p.labs.ph) <= 0.02
            ? ok(`${id}: evolucao.pontos[${pi}] pH consistente com Henderson-Hasselbalch`)
            : bad(`${id}: evolucao.pontos[${pi}] pH ${p.labs.ph} NÃO bate com Henderson-Hasselbalch (derivado ${phDerivado.toFixed(3)})`);
          if (typeof p.narrativa !== "string" || p.narrativa.length < 10) bad(`${id}: evolucao.pontos[${pi}].narrativa ausente/curta`);
          if (typeof p.t !== "string" || !p.t.length) bad(`${id}: evolucao.pontos[${pi}].t ausente`);
        });
        ev.escada.forEach((step, si) => {
          if (!step || typeof step.pergunta !== "string" || step.pergunta.length < 5 || typeof step.resposta !== "string" || step.resposta.length < 5) {
            bad(`${id}: evolucao.escada[${si}] malformado (precisa pergunta/resposta)`);
          }
          if (step && step.pontoIdx != null && (!Number.isInteger(step.pontoIdx) || step.pontoIdx < 0 || step.pontoIdx >= ev.pontos.length)) {
            bad(`${id}: evolucao.escada[${si}].pontoIdx=${step.pontoIdx} fora do intervalo de pontos`);
          }
        });
        ok(`${id}: evolucao estruturalmente válida (${ev.pontos.length} ponto(s), 8 passos)`);
      }

      // spoiler: vinheta/pergunta não podem citar outro caso (G-NN) antes do reveal
      const otherIdMention = (caso.vinheta + " " + caso.pergunta).match(/G-\d{2,3}/g);
      if (otherIdMention) {
        bad(`${id}: vinheta/pergunta cita outro caso (${otherIdMention.join(",")}) antes do reveal — spoiler`);
      } else {
        ok(`${id}: vinheta/pergunta sem citação prematura de outro caso`);
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
