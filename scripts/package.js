"use strict";
/*
 * package.js — empacota o site num ZIP versionado para distribuição offline.
 * Usa `git archive` (só arquivos versionados no HEAD → reprodutível, sem lixo
 * de working tree). A versão vem de package.json. Saída em dist/ (gitignored).
 *
 *   npm run package
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const outDir = path.join(root, "dist");
fs.mkdirSync(outDir, { recursive: true });

const name = `cad360-${pkg.version}.zip`;
const outPath = path.join(outDir, name);

execFileSync("git", ["archive", "--format=zip", `--prefix=cad360-${pkg.version}/`, "-o", outPath, "HEAD"], {
  cwd: root,
  stdio: ["ignore", "inherit", "inherit"],
});

const bytes = fs.statSync(outPath).size;
console.log(`empacotado: dist/${name} (${(bytes / 1048576).toFixed(1)} MB) — só arquivos versionados no HEAD.`);
