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

  // perfis: renderiza os 9 perfis do bloco profiles-data, cada um com caso + deep-link
  let calcHref = null;
  {
    const { p, errs } = await page("perfis/index.html");
    errs.length ? bad("perfis erros: " + errs.join(" | ")) : ok("perfis/index.html sem erro de runtime");
    const n = await p.evaluate(() => document.querySelectorAll(".prof").length);
    n === 9 ? ok("perfis: 9 perfis renderizados") : bad(`perfis: esperava 9, renderizou ${n}`);
    const nCasos = await p.evaluate(() => document.querySelectorAll(".caso").length);
    nCasos === 9 ? ok("perfis: 9 casos sintéticos renderizados") : bad(`perfis: esperava 9 casos, renderizou ${nCasos}`);
    calcHref = await p.evaluate(() => document.querySelector("#p-classica a.calc")?.getAttribute("href") || null);
    calcHref && calcHref.includes("na=") ? ok("perfis: deep-link para a calculadora presente") : bad("perfis: deep-link ausente/malformado");

    // Tutor: preenche o caso "clássica" e confirma que classifica de volta para o próprio perfil
    const hasCore = await p.evaluate(() => typeof window.CadCore?.classifyDkaProfile === "function");
    hasCore ? ok("perfis: window.CadCore carregado (core/cad_core.js via script src)") : bad("perfis: window.CadCore ausente");
    if (hasCore) {
      await p.fill("#t_na", "132"); await p.fill("#t_cl", "92"); await p.fill("#t_hco3", "8");
      await p.fill("#t_glu", "480"); await p.fill("#t_bhb", "6.5"); await p.fill("#t_ph", "7.15"); await p.fill("#t_alb", "4.2");
      await p.waitForTimeout(150);
      const tut = await p.evaluate(() => ({
        text: document.getElementById("tut_out")?.innerText || "",
        href: document.querySelector(".tut-match")?.getAttribute("href") || null,
      }));
      tut.href === "#p-classica" ? ok("Tutor: caso clássica classificado corretamente (top match -> #p-classica)") : bad(`Tutor: esperava #p-classica, obteve ${tut.href} (${tut.text.slice(0, 80)})`);
    }
    await p.close();
  }

  // Tutor SEM βHB — só cetonúria em cruzes (a realidade prática no Brasil)
  {
    const { p, errs } = await page("perfis/index.html");
    await p.fill("#t_na", "132"); await p.fill("#t_cl", "92"); await p.fill("#t_hco3", "8");
    await p.fill("#t_glu", "480"); await p.fill("#t_cet", "4"); await p.fill("#t_ph", "7.15"); await p.fill("#t_alb", "4.2");
    await p.waitForTimeout(150);
    const tut = await p.evaluate(() => ({
      href: document.querySelector(".tut-match")?.getAttribute("href") || null,
      computed: document.querySelector(".tut-computed")?.innerText || "",
    }));
    errs.length ? bad("Tutor (cetonúria) erros: " + errs.join(" | ")) : ok("Tutor (cetonúria, sem βHB) sem erro de runtime");
    tut.href === "#p-classica" ? ok("Tutor: cetonúria sozinha (sem βHB) classifica corretamente (-> #p-classica)") : bad(`Tutor (cetonúria): esperava #p-classica, obteve ${tut.href}`);
    tut.computed.includes("cetonúria") ? ok("Tutor: painel computado indica eixo cetônico = cetonúria") : bad(`Tutor: painel computado não indica cetonúria (${tut.computed})`);
    await p.close();
  }

  // Tutor + DRC dialítica: glicose muito alta NÃO deve puxar para cad-hhs — o contexto
  // renal prevalece sobre a heuristica usual de glicose/osm
  {
    const { p, errs } = await page("perfis/index.html");
    await p.fill("#t_na", "138"); await p.fill("#t_cl", "94"); await p.fill("#t_hco3", "8");
    await p.fill("#t_glu", "780"); await p.fill("#t_cet", "4"); await p.fill("#t_ph", "6.98"); await p.fill("#t_alb", "3.2");
    await p.check("#t_dial");
    await p.waitForTimeout(150);
    const tut = await p.evaluate(() => ({
      hrefs: [...document.querySelectorAll(".tut-match")].map((a) => a.getAttribute("href")),
    }));
    errs.length ? bad("Tutor (DRC dialítica) erros: " + errs.join(" | ")) : ok("Tutor (DRC dialítica) sem erro de runtime");
    tut.hrefs[0] === "#p-dialitica" ? ok("Tutor: DRC dialítica classificada corretamente (-> #p-dialitica), mesmo com glicose 780") : bad(`Tutor (DRC dialítica): esperava #p-dialitica como top match, obteve ${JSON.stringify(tut.hrefs)}`);
    tut.hrefs.includes("#p-cad-hhs") ? bad("Tutor: DRC dialítica não deveria também apontar para #p-cad-hhs") : ok("Tutor: DRC dialítica não confunde com #p-cad-hhs");
    await p.close();
  }

  // deep-link ponta a ponta: perfil clássico -> app/#calcular preenche e calcula
  if (calcHref) {
    const qs = calcHref.split("?")[1] || "";
    const { p, errs } = await page("app/index.html#calcular?" + qs);
    await p.waitForTimeout(200);
    const state = await p.evaluate(() => ({
      tab: document.querySelector("nav.tabs button.on")?.dataset.tab,
      na2: document.getElementById("na2")?.value,
      agcV: document.getElementById("agc_v")?.textContent,
    }));
    errs.length ? bad("deep-link erros: " + errs.join(" | ")) : ok("deep-link app sem erro de runtime");
    state.tab === "calcular" ? ok("deep-link: abriu na aba Calcular") : bad(`deep-link: aba='${state.tab}' (esperava calcular)`);
    state.na2 && state.agcV && state.agcV !== "—" ? ok(`deep-link: calculadora preenchida e calculada (AGc=${state.agcV})`) : bad("deep-link: calculadora não preencheu/calculou");
    await p.close();
  }

  // tratado: página grande, mas deve carregar sem erro e ter os cross-links para perfis
  {
    const { p, errs } = await page("tratado/index.html");
    const nLinks = await p.evaluate(() => document.querySelectorAll('a[href*="perfis"]').length);
    nLinks >= 2 ? ok(`tratado: ${nLinks} cross-link(s) para perfis/`) : bad(`tratado: esperava >=2 links para perfis, achou ${nLinks}`);

    // Marco/Tutor: mesmo caso clássica testado em perfis/, agora dentro do tratado
    const hasCore = await p.evaluate(() => typeof window.CadCore?.classifyDkaProfile === "function");
    hasCore ? ok("tratado: window.CadCore carregado (core/cad_core.js via script src)") : bad("tratado: window.CadCore ausente");
    if (hasCore) {
      await p.fill("#tt_na", "132"); await p.fill("#tt_cl", "92"); await p.fill("#tt_hco3", "8");
      await p.fill("#tt_glu", "480"); await p.fill("#tt_bhb", "6.5"); await p.fill("#tt_ph", "7.15"); await p.fill("#tt_alb", "4.2");
      await p.waitForTimeout(150);
      const tut = await p.evaluate(() => ({
        href: document.querySelector(".ttut-match")?.getAttribute("href") || null,
        text: document.getElementById("ttut_out")?.innerText || "",
      }));
      tut.href === "../perfis/#p-classica" ? ok("tratado Tutor: caso clássica classificado corretamente (-> ../perfis/#p-classica)") : bad(`tratado Tutor: esperava ../perfis/#p-classica, obteve ${tut.href} (${tut.text.slice(0, 80)})`);
    }
    errs.length ? bad("tratado erros: " + errs.join(" | ")) : ok("tratado/index.html sem erro de runtime");
    await p.close();
  }

  // painel: série real (P1-P6) + banco de gasometrias sintético (crescente, separado)
  {
    const { p, errs } = await page("painel/index.html");
    const hasCores = await p.evaluate(() => typeof window.CadCore?.anionGap === "function" && typeof window.AbgCore?.classifyPrimaryDisturbance === "function");
    hasCores ? ok("painel: CadCore + AbgCore carregados (core/*.js via script src)") : bad("painel: CadCore/AbgCore ausente");

    const counts = await p.evaluate(() => ({ cards: document.querySelectorAll("#gasoList .gcard").length, gaso: (typeof GASO !== "undefined" ? GASO : []).length }));
    counts.cards > 0 && counts.cards === counts.gaso
      ? ok(`painel: banco de gasometrias — ${counts.cards} casos renderizados (bate com content/gasometrias.json)`)
      : bad(`painel: cards renderizados (${counts.cards}) != casos em GASO (${counts.gaso})`);

    // navega para um caso de AG mascarado, revela o gabarito, confere o cálculo ao vivo
    const revealed = await p.evaluate(() => {
      selGaso("G-20");
      toggleGasoReveal();
      return document.getElementById("gasoDetail").innerText;
    });
    /AG\s*=\s*.*28/.test(revealed) ? ok("painel: gabarito revelado mostra AG calculado ao vivo (G-20)") : bad(`painel: AG calculado ao vivo não apareceu no reveal (${revealed.slice(0, 150)})`);

    // confundeCom navega para outro caso
    const navOk = await p.evaluate(() => {
      const btn = document.querySelector(".gconf button");
      if (!btn) return false;
      btn.click();
      return gasoCur !== "G-20";
    });
    navOk ? ok("painel: clique em confundeCom navega para outro caso") : bad("painel: clique em confundeCom não navegou");

    // filtro por categoria reduz a lista
    const filteredOk = await p.evaluate(() => {
      const chip = document.querySelectorAll("#gasoCats .gcat")[1];
      if (!chip) return false;
      chip.click();
      return document.querySelectorAll("#gasoList .gcard").length < 20;
    });
    filteredOk ? ok("painel: filtro de categoria reduz a lista de casos") : bad("painel: filtro de categoria não reduziu a lista");

    errs.length ? bad("painel erros: " + errs.join(" | ")) : ok("painel/index.html sem erro de runtime");
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
      if (typeof showTab === "function") showTab("calcular");
      await new Promise((r) => setTimeout(r, 150));
      // as calculadoras nao duplicam o exercicio a mao -- atlasEx() busca
      // do mesmo banco.B-6 que a aba Atlas mostra (unificacao 2026-07-05)
      out.osmExAtlas = (typeof ATLAS !== "undefined" ? ATLAS : null)?.banco?.find((x) => x[0].startsWith("B-6"));
      out.osmExCalc = (typeof CALCS !== "undefined" ? CALCS : null)?.find((c) => c.id === "osm")?.ex;
      return out;
    });
    errs.length ? bad("app erros: " + errs.join(" | ")) : ok("app sem erro de runtime");
    r.stamp > 0 ? ok("app: stamp do CANON renderizou") : bad("app: stamp vazio");
    r.canvas ? ok("app: canvas da Fisiologia com tamanho > 0") : bad("app: canvas com tamanho zero");
    [["quiz", r.quiz], ["leis", r.leis], ["banco", r.banco], ["modA", r.modA]].forEach(([k, n]) =>
      n > 20 ? ok(`app: #${k} populado (${n} chars)`) : bad(`app: #${k} vazio/curto (${n})`)
    );
    (r.osmExAtlas && r.osmExCalc && r.osmExCalc.stem === r.osmExAtlas[1] && r.osmExCalc.ans === r.osmExAtlas[2])
      ? ok("app: exercício da calculadora Osmolaridade efetiva == banco B-6 do Atlas (fonte única, via atlasEx)")
      : bad(`app: exercício da calculadora Osmolaridade efetiva DIVERGE do banco B-6 (calc=${JSON.stringify(r.osmExCalc)}, atlas=${JSON.stringify(r.osmExAtlas)})`);
    await p.close();
  }

  await browser.close();
  console.log("");
  if (fails) { console.error(`RENDER-SMOKE: ${fails} FALHA(S).`); process.exit(1); }
  console.log("RENDER-SMOKE: saidas executam e renderizam sem erro.");
})().catch((e) => { console.error("render_smoke: " + e.message); process.exit(1); });
