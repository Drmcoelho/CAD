# STATUS — trilha de auditoria

Estado do canon por camada, na versão `CAD360-ApA-2026-07-01`. O que estiver ✅ passa no `npm run check`.

## Motor e doutrina
- ✅ `core/cad_core.js` — `POLICY` congelado, 292 asserções passando. K `<3,5 / 3,5–5,0 / ≥5,0`; bicarbonato pH-driven; Na 1,6/2,4; Δ/Δ `<1 / 1–2 / >2`; osm efetiva com Na medido.
- ✅ `canon/policy.json` — espelho em JSON, batendo com o core (verificado no portão).
- ✅ `core/abg_core.js` — motor geral de acid-base (não específico de CAD), 16 asserções passando. Reusa AG/AGc de `cad_core.js`; branch-order corrigido para direção de pH decidir o primário quando HCO₃/pCO₂ divergem em direções opostas (bug real, achado antes de escrever os casos de gasometria — ver CHANGELOG 2026-07-05).

## Banco de gasometrias (`content/gasometrias.json`, `painel/index.html`)
- ✅ **Completo: 100/100 casos** (G-01..G-100), 100 diagnósticos diferentes, verificados por `scripts/check_gasometrias.js` (Henderson-Hasselbalch, distúrbio primário, AG/AGc, hasDka). UI em `painel/index.html`, separada da série real.
- ✅ **Quiz por caso**: os 100 casos têm `quiz{mcq,vf,assertivas}` (múltipla escolha + 3 V/F + assertivas I/II/III), estrutura e índice de resposta correta verificados mecanicamente por `check_gasometrias.js` (índice das assertivas recomputado a partir de `verdades`, mcq cruzado contra o título do caso). Render interativo em `painel/index.html` no mesmo padrão do provão de `app/index.html`.
- ✅ **100 cards clicáveis com feedback visível**: `selGaso()` rola o painel de detalhe para a viewport ao selecionar um card (antes, clicar num card do topo atualizava o detalhe fora da tela, sem feedback perceptível).
- ✅ **Sortear caso, sem spoiler**: botão "Sortear caso" escolhe um caso aleatório (respeitando o filtro de categoria ativo, sem repetir o sorteio imediatamente anterior) e entra em modo cego — título, categoria e badge "imita CAD" ficam ocultos, tanto no painel de detalhe quanto no card destacado na grade, até o aluno clicar em "revelar gabarito". A categoria também é spoiler (ex.: "Acidose metabólica AG alto (não-cetótica)" já entrega metade do diagnóstico) — achado real em uso, corrigido junto com o título. Clique direto num card da lista continua mostrando título/categoria de cara (navegação normal, sem modo cego).

## Banco de fisiopatologia/mecanismo (`content/fisiopatologia.json`, `app/index.html` aba Provão)
- ✅ **25 questões** (lote 1: 16 + lote 2: 9), ancoradas a `cad_core.js`/`abg_core.js` via array `"computed"` — cada afirmação de mecanismo é recomputada de verdade, não só prosa. Lote 2 fecha `correctedAnionGap()` (albumina), o limiar de HHS (300 do motor vs 320 do critério formal), `isResolvedDka()` isolada, e mais 2 dos 8 perfis de `classifyDkaProfile()` (`pre-cad`, `alcoolica-jejum`). `scripts/check_fisiopatologia.js` recalcula 29 âncoras do banco **e** as 8 âncoras de conduta (K/insulina) em `content/questions.json` (mesmo campo `"computed"`), fechando o gap entre "conduta" (mais macia, guideline) e as duas funções que já a codificam deterministicamente (`potassiumPlan`/`insulinPlan`). UI em `app/index.html` (`#fisioQuiz`), reaproveitando 100% do render/placar já existente.

## Pranchas — lote 1 (M01–M06 + EX01–EX02)
- ✅ M04 calculadoras — bandas Δ/Δ corrigidas, osm separada (tonicidade × osm-gap), exemplo glicose 320 (evita o fator 2,4).
- ✅ EX01 Δ/Δ 0,71 — resolve o conflito entre pranchas ("rótulo antigo: pura" → "corrigido: hiperclorêmica").
- ✅ **M06 insulina — furo do K fechado.** A "regra de plantão" agora usa `K < 3,5 / 3,5–5,0 / ≥5,0`, com a nota "o antigo 5,5 não é doutrina deste projeto". Documentado em `pranchas/revisao-m2-m4-m6.png`. Colisão de layout resolvida.

## Pranchas — lote 2 (M07–M12 + EX03–EX04)
- ✅ M07–M12 e EX03 — canon-alinhados (K, bicarbonato pH<7,0 não-rotina, jejum/transição, gasometria-filme, compensação lenta, condutas por perfil).
- ✅ **EX04 (CAD+HHS) — corrigido em JSON + SVG + PNG.** A osm efetiva usava **Na corrigido** (`2·142 + 600/18 = 317,3`), que dupla-conta a glicose. Agora usa **Na medido**: `2·130 + 600/18 = 293,3`. O template do gerador virou **data-driven** (lê `na`/`effective_osm` do JSON, não pode mais divergir), e a interpretação foi corrigida: 293 ainda **não** cruza o limiar HHS (>320); o Na corrigido 142 sinaliza o déficit de água livre emergente. O portão de CI (passo [5]) enforça isso para todos os exercícios.

## Fase 1 — hotfix clínico (auditoria externa, 01/07)
- ✅ A1: "0,93 quase pura" → "limítrofe, logo abaixo de 1".
- ✅ Operadores de K → `≥` (reinício `K ≥ 3,5`; banda inicial `K ≥ 5,0`). Render da aba Referência revisado.
- ✅ Bicarbonato: frase seca → "decisão de terapia intensiva conforme gravidade/protocolo local/risco".
- ✅ hrefs do app corrigidos para o layout do repo (`../tratado/`, `../painel/`, `../docs/`).
- ✅ `core/fixtures.json` + `fixtures.test.js` (12 asserções: Δ/Δ 0,71/0,93/1,0/2,1, osm, K).
- ✅ `scripts/test_links.js` no CI.
- Adjudicação completa da auditoria externa em `ROADMAP.md` §1. Fases 3–5 abertas lá.

## Reconciliações de doutrina
- **Bicarbonato.** `core.js` usa `considerBelowPh: 7.0` (literal do consenso 2024). `canon/policy.json` e o `app/` acrescentam `noBenefitAbovePh: 6.9` (fronteira de evidência: sem benefício acima de 6,9; abaixo, nem dado nem consenso). Ambos convivem — 7,0 é o número que o consenso escreve; 6,9 é a fronteira de evidência. Se quiser um número único no core, adicionar o campo `noBenefitAbovePh` ao `POLICY`.

## Aberto / próximo
- [x] ~~Regenerar EX04 (SVG/PNG)~~ — feito; template agora data-driven.
- [x] ~~Sincronizar `docs/auditoria`~~ — reconciliado em `docs/auditoria-erratum.md` (Δ/Δ 0,93 = limítrofe, não "quase pura"; bicarbonato consenso pH<7,0 + fronteira ≤6,9; compensação dos 4 distúrbios). **2026-07-05**: a alegação anterior de que os pontos 1–2 "já estavam aplicados no `.docx`-fonte" era falsa (achado na auditoria própria pós-PR#15) — o `.docx` ainda tinha "quase pura" e não tinha "6,9". Corrigido de fato, mais 2 achados novos (osm efetiva do B-6 dupla-contando a glicose — mesmo furo do EX04; operador `> 3,5` em vez de `≥ 3,5` no Apêndice A). `docs/auditoria.pdf` regenerado — `soffice` está instalado neste ambiente mas sua conversão headless está quebrada (falha até em `.txt` trivial); fallback usado foi `pandoc` (docx→HTML) + Chromium headless (HTML→PDF), documentado em `docs/auditoria-erratum.md` como provisório até um LibreOffice funcional regenerar no padrão nativo.
- [x] ~~Fazer o `app/index.html` expor seu `CANON` como bloco `<script type="application/json">`~~ — feito; bloco `id="canon"` (espelho do core) + self-check em runtime. `check_consistency.js` passo [7] faz deep-equal contra `core.POLICY` (valida valor-a-valor, não mais só token).
- [ ] Próximos lotes de pranchas: auditar contra o mesmo `check_consistency.js` antes de commitar.
- [x] ~~Auditoria própria pós-Fase 7~~ — **2026-07-05**: os mesmos 2 furos do `.docx` (osm efetiva com Na corrigido; operador `>` em vez de `≥` no reinício de K) estavam **ao vivo no app publicado**, em `content/atlas.json` (banco B-6 + leis[3]), `content/questions.json` (Q2/Q3) e um exercício hardcoded dentro do próprio `app/index.html` (calculadora de Osmolaridade efetiva — exceção não documentada à regra de fonte única). Todos corrigidos; ver CHANGELOG 2026-07-05.
- [x] ~~Portão automático para a prosa livre de `atlas.banco`/`atlas.leis`/`questions.exp`~~ — **2026-07-05**: `scripts/check_content_text.js`, em `npm run check`/`ci`. Cruzamento global no corpus (não por string isolada) para o furo de osm efetiva, já que o furo real era cruzado entre exercícios (B-5→B-6); testado reintroduzindo os dois furos reais artificialmente antes de confirmar zero falso positivo no estado atual.
- [x] ~~Unificar o exercício hardcoded da calculadora "Osmolaridade efetiva" com o banco B-6 do Atlas~~ — **2026-07-05**: na verdade eram **5** calculadoras duplicadas (AG/AGc/Δ/Δ/Na corrigido/osm), não só uma. `ATLAS` passa a ser parseado antes de `CALCS`; `atlasEx('B-N')` busca o exercício certo do banco em vez de repetir o texto. `check_content_text.js` barra recorrência da duplicação; `render_smoke.js` confirma paridade em runtime.
