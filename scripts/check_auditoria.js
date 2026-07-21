"use strict";
/*
 * check_auditoria.js — portao anti-drift do documento de auditoria (docs/auditoria.docx).
 *
 * O .docx e' uma SAIDA renderizada (a auditoria da Fase 1, congelada) — mas seus
 * numeros clinicos foram digitados a mao, e por isso ja driftaram do canon CINCO
 * vezes (ver docs/auditoria-erratum.md, pontos 01–05: "quase pura", bicarbonato
 * sem a fronteira 6,9, osm efetiva com Na corrigido, operador "> 3,5"). Como nao
 * ha, neste ambiente, um motor de .docx funcional (pandoc ausente, soffice
 * headless quebrado — falha ate num .txt trivial), regenerar o binario a partir
 * de uma fonte tokenizada custaria transcrever 338 paragrafos formatados e
 * perderia o cabecalho/rodape/comentarios nativos do Word, degradando um
 * artefato hoje correto. O risco REAL que a ROADMAP quer fechar nao e' a
 * diagramacao — e' o drift silencioso de um numero clinico. Isso e' fechavel sem
 * reconstruir o binario: este portao EXTRAI o texto do .docx commitado e afirma
 * que (a) os numeros canonicos do POLICY estao presentes e (b) as formas
 * OBSOLETAS de instrucao estao ausentes — a mesma disciplina que
 * check_content_text.js aplica a prosa livre dos content/*.json.
 *
 * Assim, se alguem re-exportar uma versao velha do .docx, ou reintroduzir um dos
 * cinco furos, o build quebra — mesmo sem um motor de .docx no CI.
 *
 * A extracao usa `unzip -p` (o .docx e' um zip; unzip vem no runner do CI e neste
 * ambiente). Nenhuma dependencia npm nova.
 *
 *   node scripts/check_auditoria.js
 */
const { execFileSync } = require("child_process");
const path = require("path");
const cad = require("../core/cad_core.js");

const root = path.join(__dirname, "..");
// caminho opcional (argv[2]) para testar o portao contra uma copia adulterada;
// default = o binario commitado.
const DOCX = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "docs/auditoria.docx");

let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };

function extractDocxText(docxPath) {
  let xml;
  try {
    xml = execFileSync("unzip", ["-p", docxPath, "word/document.xml"], { encoding: "utf8", maxBuffer: 1 << 26 });
  } catch (e) {
    console.error(`check_auditoria: nao consegui extrair ${docxPath} via unzip: ${e.message}`);
    process.exit(1);
  }
  const runs = xml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [];
  let text = runs.map((s) => s.replace(/<[^>]+>/g, "")).join("");
  // desescapa entidades XML para que os operadores clinicos (<, >, &) casem
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d));
  return text;
}

const text = extractDocxText(DOCX);
console.log(`[check_auditoria] texto extraido de docs/auditoria.docx (${text.length} chars)\n`);

if (text.length < 5000) {
  bad(`texto extraido curto demais (${text.length} chars) — extracao provavelmente falhou`);
}

// Cross-check de alguns valores canonicos direto do POLICY (defesa contra o proprio
// portao ficar desalinhado do core se a doutrina mudar): os literais afirmados
// abaixo tem que bater com o que o core diz hoje.
const POL = cad.POLICY || {};
const expectRestart = POL.potassium && POL.potassium.holdInsulinBelowMmolL; // 3.5 (adiar abaixo -> reinicio em >=3,5)
const expectReplace = POL.potassium && POL.potassium.replaceBelowMmolL;     // 5.0
if (expectRestart != null && expectRestart !== 3.5) {
  bad(`POLICY mudou o limiar de insulina/K para ${expectRestart} — atualizar as afirmacoes deste portao (esperava 3,5)`);
}
if (expectReplace != null && expectReplace !== 5.0) {
  bad(`POLICY mudou o limiar de reposicao de K para ${expectReplace} — atualizar este portao (esperava 5,0)`);
}

// -------- POSITIVOS: o numero canonico tem que estar no documento --------
const PRESENT = [
  [/K\s*<\s*5,0/, "K < 5,0 (reposicao canonica 2024; nao o obsoleto 5,5 do JBDS)"],
  [/≥\s*3,5/, "reinicio de insulina em ≥ 3,5 (operador correto, sem zona cinzenta)"],
  [/293,3/, "osm efetiva 293,3 (2·Na MEDIDO + glicose/18)"],
  [/Na MEDIDO/, "osm efetiva ancorada no Na MEDIDO (nunca no Na corrigido)"],
  [/limítrofe/, "Δ/Δ 0,93 rotulado 'limítrofe' (nao 'quase pura')"],
  [/pH\s*<\s*7,0/, "bicarbonato: consenso escreve pH < 7,0"],
  [/6,9/, "bicarbonato: fronteira de evidencia 6,9"],
  [/>\s*320/, "HHS: limiar osm efetiva > 320"],
];
console.log("[check_auditoria] valores canonicos presentes no documento");
PRESENT.forEach(([re, label]) => {
  re.test(text) ? ok(`presente: ${label}`) : bad(`AUSENTE (drift?): ${label}`);
});

// -------- NEGATIVOS: a forma obsoleta/errada tem que estar ausente --------
// (mencoes historicas legitimas — "o plano original citava K < 5,5", "plano:
//  0,4/0,8/2,0" — sao preservadas: nao barramos o numero cru, so as formas de
//  instrucao/erro que nao tem uso historico neste documento.)
const ABSENT = [
  [/quase pura/i, "Δ/Δ descrito como 'quase pura' (erro corrigido na Fase 1 — deve ser 'limítrofe')"],
  [/317,3|2·142|2×142/, "osm efetiva com Na corrigido (317,3 / 2·142 — dupla-conta a glicose)"],
  [/(?:reinic\w*|insulina)[^.]{0,40}>\s*3[.,]5(?!\d)/i, "operador '> 3,5' no reinicio de insulina (deveria ser '≥ 3,5')"],
  [/K\s*>\s*3,3/, "reinicio de insulina em 'K > 3,3' (obsoleto; canon usa ≥ 3,5)"],
];
console.log("\n[check_auditoria] formas obsoletas/erradas ausentes do documento");
ABSENT.forEach(([re, label]) => {
  re.test(text) ? bad(`REINCIDENCIA: ${label}`) : ok(`ausente: ${label}`);
});

console.log("");
if (fails) { console.error(`check_auditoria: ${fails} FALHA(S).`); process.exit(1); }
console.log("check_auditoria: docs/auditoria.docx bate com o canon (numeros presentes, furos ausentes).");
