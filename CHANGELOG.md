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

## [2026-07-04] — Tutor de classificação de perfil

- **`core/cad_core.js` ganha `classifyDkaProfile()`**: diferencial determinístico de perfil de CAD a partir de labs — devolve uma lista **ranqueada** de perfis plausíveis com o motivo de cada um (nunca uma caixa-preta de veredito único), mais os valores computados (AG, AGc, Δ/Δ, osm efetiva, `hasDka()`, `isResolvedDka()`). Entrada insuficiente devolve os campos que faltam, em vez de adivinhar.
- **UMD mínimo no core**: `core/cad_core.js` passa a expor `window.CadCore` quando carregado via `<script src>` em página estática (sem bundler), preservando `module.exports` para Node/CI — mesmas fórmulas, zero duplicação entre `core/` e o HTML.
- **Tutor em `perfis/index.html`**: formulário no topo da página — digite os labs, o classificador aponta o(s) perfil(is) mais prováveis com o porquê e um link direto para a seção certa.
- **Regressão do classificador**: `scripts/check_profiles.js` confirma que os 8 casos sintéticos já existentes se classificam de volta para o **próprio** perfil (top match); `core/cad_core.test.js` cobre entrada insuficiente, múltiplos matches e o caso "sem critério de CAD ativo" (matches vazio, sem forçar rótulo).
- **CI**: `render_smoke.js` preenche o Tutor com o caso clássico e confirma a classificação ponta a ponta (com `window.CadCore` real, no navegador).

## [2026-07-04] — cetonúria (cruzes) como eixo cetônico primário

Correção de realidade clínica: β-HB sérico point-of-care **não é padrão no Brasil**; o que existe na prática é a fita de cetonúria em cruzes (1+ a 4+). O código tratava β-HB como obrigatório — a doutrina já registrava a alternativa ("βHB ≥3,0 **ou** cetonúria ≥2+"), mas não estava implementada.

| Eixo | De | Para | Fonte · impacto |
|---|---|---|---|
| Diagnóstico (eixo cetônico) | β-HB obrigatório | **β-HB OU cetonúria ≥2+** (`POLICY.diagnosis.ketonuriaCruzesAtLeast = 2`) | `hasDka()` e `classifyDkaProfile()` aceitam qualquer um dos dois; cetonúria vira o campo primário do Tutor. |
| Resolução | β-HB obrigatório | **inalterado, deliberadamente** — cetonúria não confirma resolução | Cetonúria mede acetoacetato; durante o tratamento o β-HB se converte em acetoacetato, então a cetonúria pode **piorar** enquanto o paciente melhora. `isResolvedDka()` continua exigindo β-HB sérico; sem ele, `classifyDkaProfile()` devolve `isResolvedDka: null` (incerto) e — no caso ambíguo entre "parcialmente tratada" e "hiperclorêmica" — mostra **ambos** os perfis com a ressalva, em vez de escolher um calado. |

- **Achado extra corrigido**: `canon/policy.json` já tinha um campo `"ketonuriaAtLeast": "2+"` (string) sem equivalente no `core/cad_core.js` — divergência latente que o portão não pegava. Agora `ketonuriaCruzesAtLeast: 2` (número) existe nos dois lados, com checagem de igualdade em `check_consistency.js`.
- **Tutor**: cetonúria (cruzes) é o campo primário; β-HB sérico vira secundário/opcional, com nota explícita de que substitui a cetonúria quando disponível, e um aviso amarelo nomeando a armadilha do acetoacetato.
- Testado ponta a ponta (navegador real): classificação correta usando **só** cetonúria, sem β-HB, e o painel computado mostra qual eixo foi usado + "incerto (sem β-HB sérico)" quando aplicável.

## [2026-07-04] — Tutor no tratado, exceções de manejo e 9º perfil (CAD + DRC dialítica)

- **Tutor no `tratado/index.html`**: nova seção "Marco — classifique o perfil antes de ler", logo após o índice, com o mesmo `classifyDkaProfile()` (`core/cad_core.js` carregado via `<script src>`, zero fórmula duplicada). `scripts/build_app.js` ganha um bloco `profile-names-data` (`{id, nome}`, projetado de `content/profiles.json` — a prosa completa não é duplicada) para o Tutor do tratado rotular o match e linkar para `../perfis/#p-<id>`. Testado ponta a ponta (`render_smoke.js`) e estruturalmente (`smoke_app.js`).
- **Exceção de manejo — CAD severa com K baixo**: novo box em §5.3 (Potássio) documentando o padrão de prática de UTI para quadros verdadeiramente graves onde não dá para atrasar a insulina à espera do K subir — insulina em taxa reduzida já com K 3,0–3,4, **em paralelo** (não em sequência) com reposição agressiva de K. Rotulado explicitamente como **inferência/padrão de prática de terapia intensiva**, não a doutrina padrão desta ferramenta (que segue segurar insulina `<3,5` para o caso geral).
- **Dieta oral vs jejum** (nova §5.5 do tratado): critérios de quando manter via oral (CAD leve/moderada, alerta, estável) vs impor jejum (rebaixamento, vômitos persistentes, íleo, HHS com sensório comprometido). Bicarbonato renumerado de §5.5 para §5.6 (sem mudança de conteúdo).
- **Ringer lactato vs Ringer simples** (extensão de §5.1): tabela de composição ganha a linha "Ringer simples (s/ tampão)" (Na 147 · Cl 156 · sem lactato). Novo box distingue dois vieses contra o Ringer lactato — o medo do lactato "piorar a acidose" é **infundado** (o lactato exógeno vira bicarbonato hepático); o medo do K (~4 mEq/L) num paciente hipercalêmico é **plausível**, embora geralmente pequeno. Hipercalemia extrema (sem corte numérico único de consenso — descrito qualitativamente, ex. 6,0–6,5) é a situação em que o Ringer simples entra como alternativa — mas ele resolve o desconforto com o lactato, não o K nem o cloro (carga comparável ao SF). Tudo rotulado como inferência/padrão de prática, fora do `core`.
- **9º perfil: CAD em DRC dialítica (hemodiálise)** (`content/profiles.json`, `perfis/index.html`): fisiopatologia própria (sem diurese osmótica → glicose sem teto; K sem via de excreção; HCO₃ crônico vs degrau agudo; diálise como via de correção definitiva), tratamento por eixo, armadilha, incerteza e caso sintético (glicose 780, K 6,3, pH 6,98 — recalculado pelo core: AG 36 · AGc 38 · Δ/Δ 1,63 · osm efetiva 319,3). Cruza com as seções novas do tratado (§5.1 Ringer/hipercalemia, §5.3 exceção K/insulina).
- **`classifyDkaProfile()` ganha `dialysisDependent`** (contexto, não limiar numérico): quando verdadeiro, aponta direto para `"dialitica"` em vez de aplicar a heurística usual de glicose/osm para euglicêmica/CAD+HHS — que não vale nessa população (sem clearance renal de glicose). `sepse-lactato` continua compondo o diferencial normalmente (eixo ortogonal ao contexto renal). Regressão: `core/cad_core.test.js` (glicose 780 não força `cad-hhs`) e `scripts/check_profiles.js` (9º caso classifica de volta para `dialitica`).
- **CI**: `render_smoke.js` cobre o Tutor do tratado e o caso de DRC dialítica (glicose alta não confunde com CAD+HHS); `smoke_app.js` e `check_profiles.js` atualizados de 8 para 9 perfis/casos.

## [2026-07-05] — `docs/auditoria.docx`/`.pdf` de fato reconciliados (a errata anterior estava incompleta)

Auditoria própria pós-PR#15: a alegação em `docs/auditoria-erratum.md` de que os pontos 1–2 (Δ/Δ 0,93, bicarbonato 6,9) "já estavam aplicados no `.docx`-fonte" era **falsa** — extração direta do XML do `.docx` mostrou "quase pura" e nenhuma menção a "6,9". Corrigido de fato, mais 2 achados que a errata original não cobria:

| Achado | De | Para | Impacto |
|---|---|---|---|
| Δ/Δ 0,93 (worked case) | "AGMA quase pura" | "AGMA **limítrofe** (Δ/Δ < 1: já há componente hiperclorêmico...)" | Era alegado como corrigido; não estava. |
| Bicarbonato (2 menções) | "somente pH < 7,0" | + "sem benefício demonstrado acima de 6,9 — abaixo disso, decisão de UTI" | Idem — alegado, não aplicado. |
| Exercício B-6 (osm efetiva) | `2·142 (Na corrigido) + 600/18 = 317` | `2·130 (Na MEDIDO) + 600/18 = 293,3` | **Mesmo furo do EX04** (ROADMAP §1), sobrevivendo intacto neste exercício — dupla-contava a glicose. |
| Apêndice A (potássio) | "ADIAR insulina até **> 3,5**" | "ADIAR insulina até **≥ 3,5**" | Reabria a zona cinzenta em K=3,5 que a Fase 1 eliminou em todo o resto do repo. |

- **`docs/auditoria.pdf` regenerado** a partir do `.docx` corrigido. `soffice`/LibreOffice está instalado no ambiente desta sessão, mas sua conversão headless está **quebrada** (`soffice --headless --convert-to pdf` falha até para um `.txt` trivial — confirmado não ser problema do arquivo). Fallback usado: `pandoc` (`.docx`→HTML) + Chromium headless (HTML→PDF via `page.pdf()`), com CSS mínimo para paginação A4/tabelas/tipografia. Conteúdo conferido (extração de texto do PDF batendo com as 6 correções); diagramação **não é idêntica** à exportação nativa do Word/LibreOffice — documentado como provisório em `docs/auditoria-erratum.md`.
- `docs/auditoria-erratum.md` atualizado: pontos 1–2 marcados `✅ aplicado`, pontos 4–5 (achados novos) adicionados, rodapé reescrito para descrever o pipeline real usado.
