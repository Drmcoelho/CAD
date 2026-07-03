"use strict";
/* Falha o build se algum href relativo do app apontar para arquivo inexistente
   (resolvido a partir da pasta do próprio app/index.html). */
const fs = require("fs");
const path = require("path");
const appHtml = path.join(__dirname, "..", "app", "index.html");
const appDir = path.dirname(appHtml);
const html = fs.readFileSync(appHtml, "utf8");
const hrefs = [...new Set([...html.matchAll(/href="([^":]+\.(?:html|pdf|svg|png))"/g)].map((m) => m[1]))];
let fails = 0;
if (!hrefs.length) console.log("  (nenhum link local relativo)");
for (const h of hrefs) {
  const exists = fs.existsSync(path.resolve(appDir, h));
  console.log(`  ${exists ? "ok  " : "FALL"} ${h}`);
  if (!exists) fails++;
}
if (fails) { console.error(`test_links: ${fails} link(s) quebrado(s).`); process.exit(1); }
console.log("test_links: ok");
