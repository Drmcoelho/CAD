# ROADMAP — construção do repositório

Consolida a auditoria externa (`docs/auditoria_externa.pdf`) com o que já está construído. Regra de ouro adotada: **número clínico nasce em `canon/policy.json`+`core/`; cálculo no core; conteúdo pedagógico em JSON; HTML/DOCX/SVG/PNG/PDF são saídas renderizadas.**

## 1. Adjudicação da auditoria externa

**Onde ela acerta e já foi aplicado (Fase 1 — hotfix clínico):**
- `A1 "0,93 quase pura"` → `"limítrofe, logo abaixo de 1; não chamar de pura sem olhar tendência/Cl"`. Aplicado.
- Operadores de K padronizados para `≥`: reinício `K ≥ 3,5`, banda inicial `K ≥ 5,0` (elimina a zona cinzenta em K=3,5 e K=5,0 contra o core). Aplicado no HTML.
- Bicarbonato: a frase seca "abaixo disso não há dado nem consenso" virou "não há RCT que guie: é decisão de terapia intensiva conforme gravidade, protocolo local e risco (hipocalemia, CO₂/SNC)". Aplicado.

**Onde ela acerta e vira trabalho (adotado no repo):**
- Fixtures clínicas (`core/fixtures.json` + `fixtures.test.js`): Δ/Δ 0,71 / 0,93 / 1,0 / 2,1 + osm 287,8 + CAD+HHS 293,3, recomputadas pelo core. Feito.
- Teste de links (`scripts/test_links.js`): quebra o build se href do app não existir. Feito.
- Externalizar casos/questões para `content/*.json` (hoje embutidos no HTML/geradores). **Aberto — Fase 3.**
- Fallback textual + tabela equivalente para os 2 canvas (acessibilidade). **Aberto — Fase 4.**
- Changelog clínico versionado (fonte/data/impacto por mudança de limiar). **Aberto — Fase 5.**

**Onde a recomendação #1 dela já era o núcleo do repo (convergência, não novidade):**
- "Promover core/policy.json a fonte e barrar drift" = exatamente `canon/policy.json` + `scripts/check_consistency.js` + CI, já entregues na rodada anterior. A auditoria valida a arquitetura; não a antecede.

**Onde ela erra (artefato de método — não acatar como deficiência):**
- Inventário "Canvas 0 / Inputs 0 / Botões 0" e Apêndice A "CANON não localizado": **falso**. O HTML entregue tem **2 canvas**, **18 refs de input/JS** e `const CANON=` localizável (confirmado por grep e por render). É limitação de *parse estático* sobre um app gerado em runtime (provável cache velho: `/.cache/...`). O confronto HTML×core da §8, portanto, foi inferido do texto renderizado, não do objeto CANON real.

**O que ela deixou passar (minha auditoria pegou):**
- EX04 (CAD+HHS): a osm efetiva usava **Na corrigido** (`2·142+600/18=317,3`), dupla-contando a glicose. A externa validou o lote2 como "gerado" sem ver o furo. Corrigido em JSON+SVG+PNG e o gerador virou data-driven; o portão passo [5] agora enforça osm por Na medido em todo exercício.

## 2. Arquitetura-alvo (mescla da §12 dela com o repo atual)

| Alvo dela | Estado no repo |
|---|---|
| `/core cad_core.js policy.json fixtures.json` | ✅ `core/cad_core.js` + `core/fixtures.json`; policy em `canon/policy.json` (mesma função). |
| `/content modules.json cases.json questions.json` | ⬜ hoje o conteúdo vive no HTML e nos `pranchas/*/source.json`. Fase 3 externaliza. |
| `/render generate_pranchas.py build_docx.py build_html.py` | 🟡 `pranchas/*/generate_*.py` existem; `build_html/docx` (injetar POLICY) é Fase 4. |
| `/web index.html app.js styles.css` | 🟡 `app/index.html` single-file (CSS/JS embutidos) — por decisão de offline/iOS. Modularizar é opcional. |
| `/qa test_core.js test_links.js visual_snapshots/` | ✅ `core/cad_core.test.js` + `scripts/test_links.js`; snapshots visuais em CI é Fase 4. |

Divergência consciente do alvo dela: o `app/index.html` **fica single-file** (requisito de offline/iOS/WebKit). Em vez de o HTML *importar* o core, o CANON embutido é **espelho validado pelo portão** — e a Fase 4 fecha isso de vez fazendo o HTML ser *gerado* com a POLICY injetada (CANON como build-artifact, nunca editado à mão).

## 3. Fases (o que está feito × aberto)

- **Fase 0 — Fonte única.** ✅ `canon/policy.json` + `core/` como contrato; `check_consistency.js` barra drift; CI verde.
- **Fase 1 — Hotfix clínico.** ✅ A1, operadores de K (≥), bicarbonato. Render revisado.
- **Fase 2 — Testes.** ✅ 292 asserções do core + 12 fixtures (Δ/Δ 0,71/0,93/1,0/2,1, osm, K) + links.
- **Fase 3 — Dados.** ⬜ Extrair casos/questões do HTML para `content/{cases,questions}.json`; o app e o DOCX passam a ler o mesmo banco. Critério: nenhum número clínico hardcoded em parágrafo solto ou pixel.
- **Fase 4 — UI/render.** ⬜ (a) `build_html.py` injeta POLICY → CANON vira artefato; (b) fallback textual + tabela para os 2 canvas; (c) snapshot visual em CI.
- **Fase 5 — Release.** ⬜ Changelog clínico (fonte/data/impacto); pacote ZIP versionado; checklist abaixo.

## 4. Checklist de release

- [ ] `npm run ci` verde (core + fixtures + consistência + links).
- [ ] Busca textual não acha `0,4-0,8 pura`, `ureia na efetiva`, `K < 5,5`, `K > 3,3` como instrução.
- [ ] Fronteiras (K, Δ/Δ, HHS, bicarbonato) com operadores padronizados (K = `≥`).
- [ ] Pranchas renderizadas e revisadas; DOCX sem clipping; EX04 regenerado.
- [ ] Changelog atualizado (fonte, data, impacto, artefatos afetados).
- [ ] Regulatório: mantido uso pessoal autoral humano-no-loop; qualquer compartilhamento dispara triagem SaMD (tripwire).
