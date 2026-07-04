"use strict";
/*
 * build_app.js — CANON como artefato de build (ROADMAP Fase 4a, fatia segura).
 *
 * O bloco <script type="application/json" id="canon"> do app é a POLICY do core
 * renderizada. Em vez de mantê-lo à mão (e confiar no portão [7] só para pegar
 * divergência DEPOIS), este script o REGENERA a partir de core.POLICY, tornando
 * impossível que ele seja editado à mão sem ser sobrescrito.
 *
 *   node scripts/build_app.js          # reescreve o bloco a partir do core
 *   node scripts/build_app.js --check  # falha (exit 1) se o bloco estiver fora de sincronia
 *
 * O --check roda no CI: garante que o app commitado == o que o build geraria.
 * Nota de escopo: isto injeta a POLICY (os NÚMEROS clínicos). A externalização
 * do conteúdo pedagógico (casos/questões → content/*.json) é a Fase 3, à parte.
 */
const fs = require("fs");
const path = require("path");
const { POLICY } = require("../core/cad_core.js");

const root = path.join(__dirname, "..");
const appPath = path.join(root, "app", "index.html");
const check = process.argv.includes("--check");

const RE = /(<script[^>]*id="canon"[^>]*>)([\s\S]*?)(<\/script>)/;

const html = fs.readFileSync(appPath, "utf8");
const m = html.match(RE);
if (!m) {
  console.error("build_app: bloco <script id=canon> nao encontrado em app/index.html");
  process.exit(1);
}

// bloco canonico = POLICY serializada (2 espacos), com quebras de linha ao redor
// idênticas ao formato commitado, para regeneração idempotente.
const block = "\n" + JSON.stringify(POLICY, null, 2) + "\n";
const next = html.replace(RE, `$1${block}$3`);

if (next === html) {
  console.log("build_app: bloco canon em sincronia com core.POLICY.");
  process.exit(0);
}

if (check) {
  console.error("build_app: bloco canon FORA DE SINCRONIA com core.POLICY. Rode `npm run build`.");
  process.exit(1);
}

fs.writeFileSync(appPath, next);
console.log("build_app: bloco canon regenerado a partir de core.POLICY.");
