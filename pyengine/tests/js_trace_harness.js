"use strict";
/*
 * js_trace_harness.js — captura o comportamento REAL do motor JS durante a
 * suíte oficial (npm test, 155 asserções), para o gate de paridade JS↔Python.
 *
 * Como funciona: intercepta Module._load para (a) contar cada chamada real ao
 * módulo `assert` por arquivo de teste e (b) devolver, no lugar de
 * core/cad_core.js e core/abg_core.js, um proxy que registra cada invocação de
 * função exportada — argumentos, resultado ou exceção — e delega ao motor
 * real. Os quatro arquivos de teste rodam intactos; qualquer asserção que
 * falhe aborta o harness (exit != 0). O trace resultante é o conjunto exato de
 * invocações que as 155 asserções exercitam.
 *
 * Determinismo: sem rede, sem relógio, sem aleatoriedade; a saída depende só
 * dos arquivos do repo (hashes SHA-256 incluídos no trace para auditoria).
 *
 * Uso:  node pyengine/tests/js_trace_harness.js <saida.json>
 *
 * NÃO altera nenhum arquivo do repo; é leitura + execução da suíte existente.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Module = require("module");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = process.argv[2] || path.join(__dirname, "parity_trace.json");

const TEST_FILES = [
  "core/cad_core.test.js",
  "core/cad_core.contract.test.js",
  "core/fixtures.test.js",
  "core/abg_core.test.js",
];

const ENGINE_FILES = {
  [path.join(ROOT, "core", "cad_core.js")]: "cad",
  [path.join(ROOT, "core", "abg_core.js")]: "abg",
};

// ---- serialização com sentinelas p/ valores fora do JSON (NaN, ±Inf, undefined)
function ser(v) {
  if (v === undefined) return { __undefined__: true };
  if (typeof v === "number") {
    if (Number.isNaN(v)) return { __nan__: true };
    if (v === Infinity) return { __inf__: 1 };
    if (v === -Infinity) return { __inf__: -1 };
    return v;
  }
  if (v === null || typeof v === "string" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map(ser);
  if (typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = ser(v[k]);
    return o;
  }
  return { __unserializable__: String(typeof v) };
}

const calls = [];
let assertCount = 0;
let currentFile = null;
const assertPerFile = {};

function wrapEngine(engineName, realExports) {
  const proxy = {};
  for (const key of Object.keys(realExports)) {
    const member = realExports[key];
    if (typeof member !== "function") {
      proxy[key] = member; // POLICY etc. — referência direta, congelada no core
      continue;
    }
    proxy[key] = function (...args) {
      const rec = { engine: engineName, fn: key, args: args.map(ser) };
      try {
        const result = member.apply(this, args);
        rec.result = ser(result);
        calls.push(rec);
        return result;
      } catch (err) {
        rec.error = { name: err.constructor.name, message: err.message };
        calls.push(rec);
        throw err;
      }
    };
  }
  return proxy;
}

// ---- contador de asserções: mesmo mecanismo usado no inventário da Etapa 0
const realAssert = require("assert");
function countingAssert() {
  const wrap = (fn) =>
    function (...args) {
      assertCount += 1;
      if (currentFile) assertPerFile[currentFile] = (assertPerFile[currentFile] || 0) + 1;
      return fn.apply(this, args);
    };
  const patched = wrap(realAssert);
  for (const k of Object.keys(realAssert)) {
    patched[k] = typeof realAssert[k] === "function" ? wrap(realAssert[k]) : realAssert[k];
  }
  return patched;
}
const patchedAssert = countingAssert();

const engineProxies = new Map();
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "assert" || request === "node:assert") return patchedAssert;
  let resolved = null;
  try {
    resolved = Module._resolveFilename(request, parent, isMain);
  } catch {
    /* builtin ou irresolvível: segue o fluxo normal */
  }
  if (resolved && ENGINE_FILES[resolved]) {
    if (!engineProxies.has(resolved)) {
      const real = origLoad.apply(this, arguments);
      engineProxies.set(resolved, wrapEngine(ENGINE_FILES[resolved], real));
    }
    return engineProxies.get(resolved);
  }
  return origLoad.apply(this, arguments);
};

// ---- roda a suíte oficial, arquivo a arquivo (mesma ordem do npm test)
for (const rel of TEST_FILES) {
  currentFile = rel;
  require(path.join(ROOT, rel)); // asserção que falhar lança e aborta o harness
}
currentFile = null;

// ---- POLICYs reais dos dois motores, para deep-equal no lado Python
const cadCore = require(path.join(ROOT, "core", "cad_core.js"));
const abgCore = require(path.join(ROOT, "core", "abg_core.js"));

const sha256 = (rel) =>
  crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");

const trace = {
  note:
    "Trace de paridade gerado por js_trace_harness.js a partir da suíte JS oficial. " +
    "Arquivo GERADO — não editar à mão; regenerar com: node pyengine/tests/js_trace_harness.js",
  nodeVersion: process.version,
  substrateHashes: {
    "core/cad_core.js": sha256("core/cad_core.js"),
    "core/abg_core.js": sha256("core/abg_core.js"),
    "canon/policy.json": sha256("canon/policy.json"),
  },
  assertions: { perFile: assertPerFile, total: assertCount },
  policy: { cad: ser(cadCore.POLICY), abg: ser(abgCore.POLICY) },
  calls,
};

fs.writeFileSync(OUT, JSON.stringify(trace, null, 1) + "\n");
console.log(
  `trace: ${calls.length} chamadas capturadas, ${assertCount} asserções verdes ` +
    `(${Object.entries(assertPerFile).map(([f, n]) => `${path.basename(f)}=${n}`).join(", ")}) -> ${OUT}`
);
