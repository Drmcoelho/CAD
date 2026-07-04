"use strict";
/*
 * smoke_app.js — smoke test estrutural das saídas HTML (sem navegador).
 * Complementa check_consistency.js (que valida a doutrina): aqui o alvo é a
 * INTEGRIDADE ESTRUTURAL do app e da landing — que nenhuma refatoração quebrou
 * as abas, o bloco canon, as tabelas de acessibilidade ou os links de entrada.
 * Roda no CI. Sem dependências.
 *
 *   node scripts/smoke_app.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };
const has = (label, hay, needle) => (hay.includes(needle) ? ok(label) : bad(`${label} — ausente: ${needle}`));

console.log("[smoke] app/index.html — estrutura");
const app = read("app/index.html");

// 1. as 6 abas existem como <section class="tab" id="...">
["entender", "fisio", "calcular", "provao", "atlas", "ref"].forEach((id) =>
  has(`aba #${id}`, app, `id="${id}"`)
);

// 2. bloco canon (fonte da verdade legível por máquina) presente e parseável
{
  const m = app.match(/<script[^>]*id="canon"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) bad("bloco <script id=canon> ausente");
  else {
    try {
      const j = JSON.parse(m[1]);
      j && j.version ? ok(`bloco canon parseia (version ${j.version})`) : bad("bloco canon sem version");
    } catch (e) { bad("bloco canon nao e JSON valido: " + e.message); }
  }
}

// 2b. bancos externalizados (Fase 3): questions-data (provão) e cases-data (socráticos)
[
  ["questions-data", (j) => Array.isArray(j) && j.length > 0, "array nao-vazio"],
  ["cases-data", (j) => j && j.A && j.B, "objeto com A e B"],
  ["atlas-data", (j) => j && ["banco", "ladder", "feno", "leis", "proj"].every((k) => Array.isArray(j[k])), "banco/ladder/feno/leis/proj"],
].forEach(([id, valid, desc]) => {
  const m = app.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)</script>`));
  if (!m) return bad(`bloco <script id=${id}> ausente`);
  try {
    const j = JSON.parse(m[1]);
    valid(j) ? ok(`bloco ${id} parseia (${desc})`) : bad(`bloco ${id} invalido: esperado ${desc}`);
  } catch (e) { bad(`bloco ${id} nao e JSON valido: ${e.message}`); }
});

// 3. acessibilidade dos 2 canvas — containers das tabelas equivalentes
["dav_tbl", "clo_tbl"].forEach((id) => has(`tabela equivalente #${id}`, app, `id="${id}"`));

// 4. os 2 canvas continuam presentes
["dav", "clo"].forEach((id) => has(`canvas #${id}`, app, `id="${id}"`));

// 5. nada de marcador de trabalho inacabado vazando para a saida
[/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /lorem ipsum/i].forEach((re) =>
  re.test(app) ? bad(`marcador de rascunho no app: ${re}`) : ok(`sem ${re}`)
);

console.log("\n[smoke] index.html — landing");
const land = read("index.html");
// os alvos de navegacao principais estao linkados
["app/", "painel/", "tratado/", "perfis/", "CHANGELOG.md"].forEach((href) =>
  has(`link ${href}`, land, `href="${href}"`)
);

// perfis/index.html — banco de perfis externalizado
console.log("\n[smoke] perfis/index.html — perfis de CAD");
const perfis = read("perfis/index.html");
{
  const m = perfis.match(/<script[^>]*id="profiles-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) bad("bloco <script id=profiles-data> ausente");
  else {
    try {
      const j = JSON.parse(m[1]);
      Array.isArray(j.perfis) && j.perfis.length === 9
        ? ok(`bloco profiles-data: ${j.perfis.length} perfis`)
        : bad(`profiles-data: esperava 9 perfis, achei ${j.perfis && j.perfis.length}`);
      const semCaso = j.perfis && j.perfis.filter((x) => !x.caso || !x.caso.labs).map((x) => x.id);
      semCaso && semCaso.length === 0
        ? ok("todos os perfis têm caso sintético com labs estruturados")
        : bad(`perfis sem caso.labs: ${semCaso && semCaso.join(", ")}`);
    } catch (e) { bad("profiles-data nao e JSON valido: " + e.message); }
  }
}
// deep-link para a calculadora: o template existe no código (a contagem real de
// 8 instâncias renderizadas, uma por perfil, é responsabilidade do render_smoke.js,
// que executa o JS — este smoke é browserless e só lê o código-fonte).
has("template do deep-link para a calculadora", perfis, 'class="calc"');
has("deep-link usa os labs do caso (na/cl/hco3/alb)", perfis, "calcHref");

// Tutor de classificacao: carrega core/cad_core.js sem duplicar formulas, e
// tem os campos de entrada. A classificacao em si (executar JS) e do render_smoke.
has("carrega core/cad_core.js (window.CadCore, sem duplicar formulas)", perfis, 'src="../core/cad_core.js"');
["t_na", "t_cl", "t_hco3", "t_glu", "t_cet", "t_bhb", "t_ph", "t_dial"].forEach((id) => has(`Tutor: campo #${id}`, perfis, `id="${id}"`));
has("Tutor: cetonúria é o campo primário do eixo cetônico (βHB secundário)", perfis, "Cetonúria (cruzes)");
has("Tutor: flag de DRC dialítica presente", perfis, "DRC dialítica");
has("Tutor: chama classifyDkaProfile", perfis, "classifyDkaProfile");

// core/cad_core.js expoe window.CadCore para as paginas estaticas usarem
has("core/cad_core.js expoe window.CadCore (UMD)", read("core/cad_core.js"), "window.CadCore");

// tratado/index.html — Marco/Tutor (mesmo classificador, sem duplicar formulas)
console.log("\n[smoke] tratado/index.html — Marco/Tutor");
const tratado = read("tratado/index.html");
has("Marco: âncora #marco existe", tratado, 'id="marco"');
has("Marco: carrega core/cad_core.js (window.CadCore, sem duplicar formulas)", tratado, 'src="../core/cad_core.js"');
["tt_na", "tt_cl", "tt_hco3", "tt_glu", "tt_cet", "tt_bhb", "tt_ph", "tt_dial"].forEach((id) => has(`Marco: campo #${id}`, tratado, `id="${id}"`));
has("Marco: chama classifyDkaProfile", tratado, "classifyDkaProfile");
has("Marco: links de match apontam para ../perfis/#p-", tratado, "../perfis/#p-");
{
  const m = tratado.match(/<script[^>]*id="profile-names-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) bad("bloco <script id=profile-names-data> ausente");
  else {
    try {
      const j = JSON.parse(m[1]);
      Array.isArray(j) && j.length >= 8 && j.every((x) => x.id && x.nome)
        ? ok(`bloco profile-names-data: ${j.length} perfis (id+nome)`)
        : bad(`profile-names-data invalido: ${JSON.stringify(j).slice(0, 120)}`);
    } catch (e) { bad("profile-names-data nao e JSON valido: " + e.message); }
  }
}

// as 16 pranchas (svg) estao indexadas
{
  const svgLinks = (land.match(/pranchas\/lote[12]\/svg\/[^"]+\.svg/g) || []).length;
  svgLinks === 16 ? ok(`16 pranchas indexadas`) : bad(`esperava 16 links de prancha, achei ${svgLinks}`);
}

console.log("");
if (fails) { console.error(`SMOKE: ${fails} FALHA(S).`); process.exit(1); }
console.log("SMOKE: estrutura das saidas intacta.");
