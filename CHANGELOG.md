# CHANGELOG — clínico e de doutrina

Registro versionado de **mudanças de limiar clínico** (o que mudou · de → para · fonte · impacto) e das correções de consistência. Segue a diretriz-mãe: número clínico nasce em `canon/policy.json` + `core/`; tudo abaixo é rastreável até essa fonte.

Fonte de verdade clínica em todas as entradas: **Umpierrez et al. *Diabetes Care* 2024;47(8):1257–1275** (consenso ADA/EASD/JBDS/AACE/DTS), salvo indicação.

---

## [CAD360-ApA-2026-07-01] — doutrina congelada

Versão-base do `POLICY` (`core/cad_core.js`) e espelho `canon/policy.json`. Limiares canônicos, com o valor **obsoleto** que substituem quando aplicável:

| Eixo | De (obsoleto) | Para (canônico) | Fonte · impacto |
|---|---|---|---|
| Potássio — repor | `< 5,5` (JBDS) | **`< 5,0`** | Consenso 2024. Alvo 4–5; repõe mais cedo. |
| Potássio — reiniciar insulina | `≥ 3,3` | **`≥ 3,5`** | Elimina a zona cinzenta; adiar insulina se `< 3,5`. |
| Δ/Δ — faixa "pura" | `0,4–0,8` | **fronteiras 1 e 2** | `< 1` já tem cauda hiperclorêmica; `1–2` limpa; `> 2` alcalose somada. |
| Osm efetiva | `2·Na corrigido + glic/18` | **`2·Na MEDIDO + glic/18`** | Na corrigido dupla-conta a glicose; efetiva = tonicidade. Ureia fora. |
| Bicarbonato | — | **pH `< 7,0`** (consenso) **+ fronteira de evidência `≤ 6,9`** | Não é rotina; abaixo de 6,9 é decisão de UTI, sem RCT. |
| Na corrigido | — | fator **1,6** (**2,4** se glicose `> 400`) | Déficit de água livre — nunca na fórmula de osm. |
| Diagnóstico | — | glicose `≥ 200` (ou DM) · βHB `≥ 3,0` (ou cetonúria `≥ 2+`) · pH `< 7,30` **e/ou** HCO₃ `< 18` | AG fora dos critérios formais. |
| Resolução | glicemia normal | **βHB `< 0,6` E (pH `≥ 7,3` OU HCO₃ `≥ 18`)** | Glicemia normal não é resolução. |
| HHS | — | osm efetiva `> 320` (comentário 2024 propõe `> 300`) | 320 é critério; 300 é alerta. |
| Insulina | — | 0,1 → 0,05 U/kg/h quando glicose `< 250` + dextrose | Dextrose = cinto de segurança. |

Cobertura: `core/cad_core.test.js` (asserções do core) + `core/fixtures.json` (Δ/Δ 0,71 / 0,93 / 1,0 / 2,1 · osm · K), recomputadas pelo core. Portão `scripts/check_consistency.js` barra qualquer divergência entre core, `policy.json`, pranchas e `app/`.

## [2026-07-01] — hotfix clínico (Fase 1, auditoria externa)

- **Δ/Δ 0,93** rotulado "quase pura" → **"limítrofe (`< 1`), já com cauda hiperclorêmica"**. Não chamar de pura sem olhar Cl⁻/tendência.
- **Operadores de K** padronizados para `≥` (reinício `K ≥ 3,5`; banda inicial `K ≥ 5,0`), consistentes com o core.
- **Bicarbonato**: frase seca substituída por "decisão de terapia intensiva conforme gravidade/protocolo local/risco".
- **EX04 (CAD+HHS)**: osm efetiva corrigida de `2·142+600/18 = 317,3` (Na corrigido) para `2·130+600/18 = 293,3` (Na medido). Gerador virou data-driven; portão passo [5] enforça osm por Na medido em todo exercício.

## [2026-07-02] — importação, infraestrutura e revisão

- **Projeto importado para a raiz** do repositório (serve via GitHub Pages).
- **Infra**: deploy de Pages + `.nojekyll`; `LICENSE` CC BY-NC-SA 4.0; template de PR; badges; `engines.node`.
- **Portão [7]**: `app/index.html` expõe o `POLICY` como bloco `<script type="application/json" id="canon">`, validado por deep-equal contra o core (valor-a-valor, não mais só presença de token).
- **`docs/auditoria-erratum.md`**: reconcilia o corpo da auditoria com o canon (Δ/Δ 0,93 = limítrofe; bicarbonato ≤ 6,9; compensação dos 4 distúrbios).
- **Compensação (aba Fisiologia)**: no eixo HCO₃, medido acima do esperado = **alcalose** metabólica associada; abaixo = **acidose** metabólica associada (rótulo e cor estavam invertidos).
- **SVG lote1**: `marker-end` sem fecho de `url()` — setas não renderizavam; corrigido e SVGs regenerados.
- **`hasDka` / `isResolvedDka`**: eixo ácido agora opcional (basta pH **ou** HCO₃, refletindo o "e/ou" do critério), com guarda que lança erro claro se faltarem ambos.

## [2026-07-03..04] — publicação

- **GitHub Pages no ar**: `configure-pages` com `enablement: true` (deploy à prova de timing); site em https://drmcoelho.github.io/CAD/. Deploy automático a cada push em `main`.

## [2026-07-04] — Fase 3 completa, perfis de CAD, deep-link

- **Conteúdo pedagógico externalizado por completo**: `content/questions.json` (provão), `content/cases.json` (casos socráticos), `content/atlas.json` (banco de cálculo, escada, fenótipos, leis, projetos) — todos lidos pelo `app/` via blocos `<script type="application/json">` injetados por `build_app.js` (`--check` no CI barra edição à mão).
- **`content/profiles.json` + `perfis/index.html`**: fisiopatologia detalhada e tratamento por eixo dos **8 fenótipos de CAD** (clássica, euglicêmica, pré-CAD, parcialmente tratada, CAD+HHS, hiperclorêmica tardia, +sepse/lactato, alcoólica/jejum), cada um com marcadores, armadilha nomeada e incerteza etiquetada.
- **Caso sintético por perfil**: cada perfil ganha um caso com labs estruturados, calculado pelo mesmo `core/cad_core.js` (não transcrição). `scripts/check_profiles.js` recalcula AG/AGc/`hasDka()`/`isResolvedDka()` a partir dos labs e confere contra o texto — quebra o build se um número for editado sem recalcular o outro.
- **Deep-link app ↔ perfis**: cada caso tem um botão que abre a calculadora do `app/` já preenchida com os números do caso (`#calcular?na=..&cl=..&hco3=..&alb=..&glu=..`), verificado ponta a ponta (headless).
- **Cross-link com o `tratado/`**: §1.6 (Variantes) e §5 (Manejo) agora apontam para `perfis/`, e `perfis/` aponta de volta para o tratado.
- **CI**: `render_smoke.js` (Fase 4c) executa as saídas num Chromium e falha em erro de runtime; `check_profiles.js` no `npm run check`.
