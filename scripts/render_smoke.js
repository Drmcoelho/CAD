"use strict";
/*
 * render_smoke.js — render-smoke DETERMINÍSTICO (executa as saídas num navegador).
 *
 * Diferente de scripts/smoke_app.js (que lê o HTML sem executar), este carrega
 * index.html e app/index.html num Chromium headless e falha se:
 *   - houver erro de página (exceção JS) ou console.error;
 *   - algum container-chave renderizar vazio (JS não populou);
 *   - os canvas da aba Fisiologia tiverem tamanho zero.
 * NÃO faz comparação de pixel (evita flakiness de fontes entre ambientes).
 *
 *   node scripts/render_smoke.js
 *
 * Requer Playwright. Local: resolve via require global. CI: instalado no job.
 */
const path = require("path");
const { execSync } = require("child_process");

function loadChromium() {
  try { return require("playwright").chromium; } catch (_) {}
  try {
    const g = execSync("npm root -g").toString().trim();
    return require(path.join(g, "playwright")).chromium;
  } catch (e) {
    console.error("render_smoke: Playwright indisponivel (" + e.message + ")");
    process.exit(2);
  }
}

const ROOT = path.join(__dirname, "..");
const EXEC = process.env.PW_CHROMIUM || undefined; // caminho opcional do binario
let fails = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.error("  FAIL " + m); fails++; };

(async () => {
  const chromium = loadChromium();
  const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});

  async function page(file) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
    p.on("console", (m) => { if (m.type() === "error") errs.push("console.error: " + m.text()); });
    await p.goto("file://" + path.join(ROOT, file), { waitUntil: "networkidle" });
    await p.waitForTimeout(300);
    return { p, errs };
  }

  // landing
  {
    const { p, errs } = await page("index.html");
    errs.length ? bad("index.html erros: " + errs.join(" | ")) : ok("index.html sem erro de runtime");
    const links = await p.evaluate(() => document.querySelectorAll("a[href]").length);
    links >= 20 ? ok(`index.html ${links} links renderizados`) : bad(`index.html poucos links: ${links}`);
    await p.close();
  }

  // perfis: renderiza os 8 perfis do bloco profiles-data
  {
    const { p, errs } = await page("perfis/index.html");
    errs.length ? bad("perfis erros: " + errs.join(" | ")) : ok("perfis/index.html sem erro de runtime");
    const n = await p.evaluate(() => document.querySelectorAll(".prof").length);
    n === 8 ? ok("perfis: 8 perfis renderizados") : bad(`perfis: esperava 8, renderizou ${n}`);
    await p.close();
  }

  // app: executa, percorre as abas, valida render dinâmico
  {
    const { p, errs } = await page("app/index.html");
    const r = await p.evaluate(async () => {
      const out = {};
      const txt = (id) => (document.getElementById(id)?.innerText || "").trim().length;
      out.stamp = txt("stamp");
      // abre a aba Fisiologia (desenha os canvas)
      if (typeof showTab === "function") showTab("fisio");
      await new Promise((r) => setTimeout(r, 250));
      const cw = document.getElementById("dav")?.width || 0;
      const ch = document.getElementById("clo")?.width || 0;
      out.canvas = cw > 0 && ch > 0;
      if (typeof showTab === "function") showTab("provao");
      await new Promise((r) => setTimeout(r, 150));
      out.quiz = txt("quiz");
      if (typeof showTab === "function") showTab("atlas");
      await new Promise((r) => setTimeout(r, 150));
      out.leis = txt("leis");
      out.banco = txt("banco");
      out.modA = txt("modA");
      return out;
    });
    errs.length ? bad("app erros: " + errs.join(" | ")) : ok("app sem erro de runtime");
    r.stamp > 0 ? ok("app: stamp do CANON renderizou") : bad("app: stamp vazio");
    r.canvas ? ok("app: canvas da Fisiologia com tamanho > 0") : bad("app: canvas com tamanho zero");
    [["quiz", r.quiz], ["leis", r.leis], ["banco", r.banco], ["modA", r.modA]].forEach(([k, n]) =>
      n > 20 ? ok(`app: #${k} populado (${n} chars)`) : bad(`app: #${k} vazio/curto (${n})`)
    );
    await p.close();
  }

  await browser.close();
  console.log("");
  if (fails) { console.error(`RENDER-SMOKE: ${fails} FALHA(S).`); process.exit(1); }
  console.log("RENDER-SMOKE: saidas executam e renderizam sem erro.");
})().catch((e) => { console.error("render_smoke: " + e.message); process.exit(1); });
