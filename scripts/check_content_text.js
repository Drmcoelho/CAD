"use strict";
/*
 * check_content_text.js — portao anti-recorrencia para a PROSA LIVRE.
 *
 * check_consistency.js valida POLICY (deep-equal); check_profiles.js valida os
 * 9 casos estruturados de profiles.json. Nenhum dos dois olha a prosa livre de
 * content/atlas.json (banco/leis), content/questions.json (exp) e o array CALCS
 * hardcoded em app/index.html — foi exatamente ali que sobreviveram, sem
 * deteccao automatica, os furos corrigidos em 2026-07-05:
 *
 *   1. operador "> 3,5" em vez de "≥ 3,5" no reinicio de insulina;
 *   2. a formula de osm efetiva usando o RESULTADO de "Na corrigido" (de um
 *      exercicio ANTERIOR, ex. B-5) em vez do Na medido — a doenca real era
 *      uma referencia CRUZADA entre dois exercicios/entradas distintas, nao
 *      um erro dentro de uma unica string. Por isso o check 2 e' GLOBAL: builda
 *      o conjunto de valores ja vistos como "resultado de Na corrigido" em
 *      QUALQUER string do corpus, e cruza contra QUALQUER uso desse valor como
 *      entrada Na de uma formula de osm efetiva em QUALQUER outra string.
 *
 * Nao e' um parser formal — e' uma rede de seguranca best-effort contra a
 * MESMA classe de erro que ja se repetiu 4 vezes neste projeto. Pode ter falso
 * positivo raro (dois exercicios genuinamente distintos coincidindo no mesmo
 * numero); revisar manualmente antes de silenciar.
 *
 *   node scripts/check_content_text.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };

// operador errado no reinicio de insulina: "...reinic...> 3,5..." (a forma
// correta usa "≥", caractere distinto de ">" — sem colisao com o certo).
const K_RESTART_WRONG_OP = /(?:reinic\w*|insulina)[^.]{0,40}>\s*3,5(?!\d)/i;

function checkOperator(text, label) {
  if (K_RESTART_WRONG_OP.test(text)) {
    bad(`${label}: operador errado no reinicio de insulina ("> 3,5"; deveria ser "≥ 3,5")`);
  }
}

// blobs = [{text, label}, ...] de TODO o corpus escaneado
function checkOsmDoubleCounting(blobs) {
  const corrigidoValues = new Map(); // valor -> Set(labels onde apareceu como "Na corrigido")
  blobs.forEach(({ text, label }) => {
    for (const m of text.matchAll(/corrigid[oa]/gi)) {
      const window = text.slice(m.index, m.index + 120);
      // pega o ULTIMO numero do trecho (seja "= NUM" ou "(NUM)"), nao o
      // primeiro — uma derivacao "corrigido = A + B = ... = RESULTADO"
      // sempre termina no valor final; pegar o primeiro capturaria o Na
      // MEDIDO de entrada da propria formula de correcao.
      const found = [
        ...[...window.matchAll(/=\s*(?:<[^>]+>\s*)*(\d{2,3}(?:,\d+)?)/g)].map((x) => ({ i: x.index, v: x[1] })),
        ...[...window.matchAll(/\(\s*(?:<[^>]+>\s*)*(\d{2,3}(?:,\d+)?)\s*\)/g)].map((x) => ({ i: x.index, v: x[1] })),
      ].sort((a, b) => a.i - b.i);
      if (!found.length) continue;
      const v = found[found.length - 1].v;
      if (!corrigidoValues.has(v)) corrigidoValues.set(v, new Set());
      corrigidoValues.get(v).add(label);
    }
  });

  const osmRe = /2\s*[·×*]\s*(\d{2,3}(?:,\d+)?)\s*(?:\([^)]{0,30}\)\s*)?\+\s*[\d,]+\s*\/\s*18/g;
  blobs.forEach(({ text, label }) => {
    for (const m of text.matchAll(osmRe)) {
      const v = m[1];
      if (corrigidoValues.has(v)) {
        const sources = [...corrigidoValues.get(v)].join(", ");
        bad(`${label}: osm efetiva usa Na ${v}, que aparece como RESULTADO de "Na corrigido" em [${sources}] — verificar se nao e' dupla-contagem da glicose (osm efetiva usa Na MEDIDO, nunca corrigido)`);
      }
    }
  });
}

function walkJsonStrings(node, label, cb) {
  if (typeof node === "string") return cb(node, label);
  if (Array.isArray(node)) return node.forEach((v, i) => walkJsonStrings(v, `${label}[${i}]`, cb));
  if (node && typeof node === "object") {
    return Object.entries(node).forEach(([k, v]) => walkJsonStrings(v, `${label}.${k}`, cb));
  }
}

const blobs = [];

console.log("[check_content_text] varrendo content/*.json (prosa livre)\n");
["content/atlas.json", "content/questions.json", "content/cases.json", "content/profiles.json"].forEach((rel) => {
  const data = JSON.parse(read(rel));
  let checked = 0;
  walkJsonStrings(data, rel, (str, label) => { checkOperator(str, label); blobs.push({ text: str, label }); checked++; });
  ok(`${rel}: ${checked} strings verificadas (operador de K)`);
});

console.log("\n[check_content_text] CALCS (app/index.html) usa atlasEx(), nao duplica o texto do banco");
{
  const app = read("app/index.html");
  const literalEx = /ex:\{stem:'(?:[^'\\]|\\.)*',ans:'(?:[^'\\]|\\.)*'\}/g;
  const literalMatches = [...app.matchAll(literalEx)];
  literalMatches.length === 0
    ? ok("nenhum exercicio de calculadora hardcoded (todos via atlasEx — fonte unica)")
    : bad(`${literalMatches.length} exercicio(s) de calculadora ainda hardcoded em CALCS (deveriam usar atlasEx('B-N') e vir de content/atlas.json)`);
  const atlasExMatches = [...app.matchAll(/ex:atlasEx\('(B-\d)'\)/g)];
  atlasExMatches.length >= 5
    ? ok(`${atlasExMatches.length} exercicios de calculadora via atlasEx()`)
    : bad(`esperava >=5 exercicios via atlasEx(), achei ${atlasExMatches.length}`);
}

console.log("\n[check_content_text] osm efetiva vs Na corrigido — cruzamento GLOBAL no corpus");
checkOsmDoubleCounting(blobs);
ok(`${blobs.length} blocos de texto cruzados`);

console.log("");
if (fails) { console.error(`check_content_text: ${fails} FALHA(S).`); process.exit(1); }
console.log("check_content_text: nenhuma recorrencia dos furos de 2026-07-05 na prosa livre.");
