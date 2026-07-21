# FIGHT.md — PR #32 × PR #33

Registro técnico de arbitragem entre duas PRs concorrentes sobre a mesma base (`main` @ `579ea7c`), abertas para o mesmo objetivo (auditoria de robustez de gabaritos/spoiler/código-em-prosa/pedagogia). A #33 se descreveu como "alternativa integral" à #32. Este documento existe porque a alegação não se sustentou por completo sob verificação — e porque a #32 também tinha achado real sem correção até este ciclo.

Metodologia: `git diff <ponta-A> <ponta-B>` direto (não `A...B`, que mascara mudanças feitas só de um lado ao usar a merge-base como referência), execução real das duas suítes de teste em worktrees isolados, e reprodução ao vivo de cada alegação de comportamento antes de aceitá-la ou rejeitá-la. Nenhuma alegação abaixo é por leitura de diff isolada sem rodar o código.

Estado no momento deste documento: **#32** = `claude/gasometria-ordem-reveal` @ `1d655a3` (antes do fix de CI trazido por este commit) · **#33** = `chatgpt/pr32-alternative-hardening` @ `b6bf00e`, draft, sem merge.

---

## Round 1 — o que a #33 realmente muda em relação à #32

`git diff origin/claude/gasometria-ordem-reveal origin/chatgpt/pr32-alternative-hardening` (comparação direta de ponta a ponta, não de merge-base) mostra exatamente 9 arquivos divergentes. Não "endurecimento sobre a #32" — a #33 tem uma raiz anterior ao commit de autocorreção da #32 (`1d655a3`), então o diff é uma mistura de reversão + adição.

## Round 2 — ponto pra #33: o CI remoto estava incompleto

`.github/workflows/ci.yml` (arquivo que a #32 nunca tocou, herdado de antes desta série inteira) rodava um subconjunto **manual** de checks no job `consistency`:

```
node core/cad_core.test.js
node core/fixtures.test.js
node scripts/build_app.js --check
node scripts/check_consistency.js
node scripts/check_profiles.js
node scripts/test_links.js
node scripts/smoke_app.js
```

Comparado a `package.json`:

```
"test": "node core/cad_core.test.js && node core/fixtures.test.js && node core/abg_core.test.js",
"check": "... && node scripts/check_content_text.js && node scripts/check_gasometrias.js && node scripts/check_fisiopatologia.js && ...",
"ci": "npm test && npm run check"
```

Faltavam no workflow: `abg_core.test.js`, `check_content_text.js`, `check_gasometrias.js`, `check_fisiopatologia.js`. Isso significa que **os portões endurecidos nesta própria série de commits — o de spoiler cruzado em `check_gasometrias.js`, o de código-em-prosa — nunca rodaram de fato no GitHub Actions**, só quando alguém lembrava de rodar `npm run ci` localmente antes de empurrar. Um regressão nesses portões passaria pelo CI remoto sem ser barrada.

Verificação: rodei `npm run ci` na branch da #33 num worktree isolado (`/tmp/pr33-check`) — passou limpo, incluindo os checks que o workflow antigo pulava.

**Veredito: achado real, procedente.** Corrigido nesta mesma rodada, incorporado ao `.github/workflows/ci.yml` da #32 — não porque a #33 pediu, mas porque a alegação se sustentou sob teste.

## Round 3 — contra #33: reverte as 3 correções da autorrevisão da #32

A #33 parte de `a0913c3`, o commit imediatamente **antes** de `1d655a3` (a autocorreção que a própria #32 já tinha publicado). Resultado, verificado por diff direto contra os três arquivos:

| Achado | #32 depois de `1d655a3` | #33 |
|---|---|---|
| `content/fisiopatologia.json` — framing de `classifyDkaProfile` | "pilha... em ordem clínica fixa... nunca uma lista ranqueada por score" | volta a afirmar "lista ranqueada" como fato, contradizendo o próprio doc-comment do core que a mesma série de commits corrigiu |
| `tratado/index.html:4983` — limiar de HHS | "osmolalidade efetiva acima de 320 mOsm/kg" | volta a "320 mOsm/kg ou mais" (≥, inconsistente com o canon e com as outras 3 menções ao mesmo limiar na própria lâmina) |
| `perfis/index.html` + `tratado/index.html` — Tutor/Marco | linha-resumo mostra só a banda (`K banda <3,5`) | volta a duplicar a frase de conduta (nota completa + resumo repetindo a mesma coisa com outras palavras) |

**Veredito: regressão de 3 correções já publicadas e verificadas.** Não é uma omissão neutra — é reintroduzir defeitos que já tinham sido encontrados, corrigidos e testados.

## Round 4 — contra #33: o "contrato mais estrito" de `kMmolL` não é mais estrito, é inconsistente

A #33 troca

```js
const kPlan = input.kMmolL != null && !Number.isNaN(input.kMmolL) ? potassiumPlan(input.kMmolL) : null;
```

por

```js
const kPlan = isProvided(input.kMmolL) ? potassiumPlan(input.kMmolL) : null;
// isProvided(value) = value !== undefined && value !== null   (NÃO checa NaN)
```

alegando, na descrição da PR: *"string, objeto, array, NaN ou infinito → TypeError explícito do contrato numérico. Não há coerção silenciosa."* Reproduzi ao vivo, no worktree da própria #33:

```
$ node -e "classifyDkaProfile({...BASE, kMmolL: NaN})"
→ THREW TypeError: kMmolL must be a finite number   (não capturado em nenhum chamador real)

$ node -e "classifyDkaProfile({...BASE, na: NaN})"     // campo OBRIGATÓRIO, mesma função
→ {"insufficient":true,"missing":["na"]}               // gracioso, comportamento pré-existente, nenhuma das duas PRs mexeu aqui
```

A própria função, na mesma versão da #33, trata `NaN` de dois jeitos incompatíveis dentro do mesmo corpo: campo obrigatório com `NaN` → degrada graciosamente (`insufficient`); campo opcional (`kMmolL`) com `NaN` → lança exceção não capturada. Isso não é "contrato mais estrito e coerente" — é uma nova inconsistência, na direção mais perigosa (o campo *opcional* passa a poder derrubar a chamada inteira, quando nenhum outro campo da função faz isso para `NaN`).

Na prática, isso não quebra nada hoje porque os dois únicos chamadores reais (`perfis/index.html`, `tratado/index.html`) já sanitizam o valor do input (`isNaN(v)?null:v`) antes de chamar `classifyDkaProfile` — então `NaN` nunca chega até lá pelos caminhos existentes. É uma armadilha latente para qualquer chamador futuro que não replique essa sanitização, não um bug ativo. O teste de contrato novo (`core/cad_core.contract.test.js`) **codifica esse throw como comportamento correto** via `assert.throws(...)`, sem que a descrição da PR reconheça a inconsistência introduzida.

**Veredito: mudança não incorporada.** O guard original da #32 (`!= null && !Number.isNaN`) é mantido — é o único dos três tratamentos de campo (obrigatório-NaN, `kMmolL`-ausente, `kMmolL`-NaN) que já se comporta de forma graciosa e uniforme com o resto da função.

## Round 5 — o resto da #33

`core/cad_core.contract.test.js` (arquivo novo, 56 linhas): boa prática nas fronteiras que testa de verdade (3.499/3.5/4.999/5.0), mas herda o problema do Round 4 ao afirmar que `NaN`/string/objeto/array *devem* lançar — não incorporado no estado atual pelo mesmo motivo do Round 4. Se a #32 vier a adotar validação estrita de tipo no futuro, esse arquivo é um bom ponto de partida, mas precisa primeiro resolver a inconsistência do Round 4 (ou generalizar o throw para todos os campos, ou não aplicá-lo a nenhum opcional).

---

## Placar final

| Rodada | Alegação da #33 | Veredito |
|---|---|---|
| CI remoto incompleto | procedente | ✅ incorporado à #32 |
| Reversão de 3 fixes da autorrevisão | regressão real | ❌ rejeitado — fixes da #32 mantidos |
| Contrato estrito de `kMmolL` (`isProvided`) | alegado, não se sustentou | ❌ rejeitado — guard original mantido |
| Teste de contrato de fronteiras | boa prática, mas depende do ponto acima | ⏸️ não incorporado nesta rodada |

## Decisão

**#32 permanece a PR de referência.** O único ganho real da #33 (cobertura de CI remota) foi extraído e aplicado diretamente em `claude/gasometria-ordem-reveal` neste mesmo ciclo, sem depender de mergear a #33. A #33 não deve ser mergeada como está — carrega uma regressão de conteúdo (3 achados já corrigidos, revertidos) e uma regressão de contrato (NaN passa de gracioso para exceção não capturada, inconsistente com o resto da própria função) camufladas atrás de uma alegação de "endurecimento" que não resiste à execução direta.

Nenhum merge foi realizado como parte desta arbitragem.

---

## Round 6 — PR #34: síntese canônica, fechando o Round 5 em aberto

O Round 5 deixou uma lacuna anotada, não resolvida: o `core/cad_core.contract.test.js` da #33 é boa prática de cobertura (fronteiras 3,499/3,5/4,999/5,0 + tipos inválidos), mas estava soldado à mudança de guard rejeitada no Round 4. Esta PR (#34, branch `agent/pr34-canonical-synthesis`, base = ponta atual da #32 em `5a45aad`) fecha essa lacuna.

**Reprodução independente do Round 4, antes de escrever qualquer linha de código**, comparando `core/cad_core.js` das duas branches lado a lado (não só lendo o FIGHT.md):

```
--- #32 (claude/gasometria-ordem-reveal @ 5a45aad) ---
kMmolL=NaN: null                                    (gracioso)
na=NaN:     {"insufficient":true,"missing":["na"]}   (gracioso)

--- #33 (chatgpt/pr32-alternative-hardening @ b6bf00e) ---
kMmolL=NaN THREW: TypeError - kMmolL must be a finite number   (não capturado)
na=NaN:     {"insufficient":true,"missing":["na"]}              (gracioso, inalterado)
```

Confirma o Round 4 byte a byte: a inconsistência é real, e o guard da #32 (`input.kMmolL != null && !Number.isNaN(input.kMmolL) ? potassiumPlan(input.kMmolL) : null`) já é logicamente equivalente a `(kMmolL == null || Number.isNaN(kMmolL)) ? null : potassiumPlan(kMmolL)` — ou seja, **já trata `NaN` como "ausente" em qualquer campo, obrigatório ou opcional, de forma uniforme**. E já lança `TypeError` para string/objeto/array/±Infinity, porque tudo que não é filtrado pelo guard cai em `potassiumPlan()` → `requiredNumber()`, que rejeita qualquer coisa que não seja `number` finito. Não faltava dureza de contrato — faltava só o teste que provasse isso.

**Decisão de design:** `core/cad_core.js` **não foi alterado nesta PR**. O comportamento já correto da #32 foi mantido byte a byte; only a cobertura de teste que faltava foi adicionada.

**O que #34 faz, concretamente:**

1. Herda a #32 inteira (`5a45aad` — os 12 commits, incluindo os 3 achados da autorrevisão e o CI já convergido para `npm run ci`). Nenhum arquivo de conteúdo/UX/spoiler/pedagogia tocado.
2. Adiciona `core/cad_core.contract.test.js` (reescrito a partir do da #33, mesma disciplina de fronteira, comportamento esperado corrigido):
   - fronteiras exatas 3,499 / 3,5 / 4,999 / 5,0 — idêntico à #33;
   - `kMmolL` ausente → `potassiumPlan: null` — idêntico às duas;
   - `kMmolL = NaN` → `potassiumPlan: null`, gracioso — **contrário ao teste da #33**, que esperava `throw`; aqui é travado como o contrato correto, com o comentário do arquivo explicando o porquê (ver Round 4);
   - **teste novo, que nenhuma das duas PRs tinha**: simetria explícita — `na`/`cl`/`hco3`/`glucoseMgDl`/`ph` = `NaN` (campos obrigatórios) também degradam para `{insufficient:true, missing:[campo]}`. Antes esse invariante só existia por leitura de código; agora está travado por teste, então uma mudança futura que quebre a simetria (torne um campo NaN-gracioso e outro NaN-estrito) quebra o CI, não só a arbitragem manual.
   - string/objeto/array/±Infinity → `TypeError` — idêntico à #33, porque já era o comportamento real do guard da #32, só não estava testado.
3. `package.json`: `cad_core.contract.test.js` entra em `"test"`, então roda dentro de `npm test` e `npm run ci`, com o mesmo `ci.yml` (`npm run ci` direto) que a arbitragem já tinha trazido pra #32.
4. Este Round 6, fechando o Round 5.

**Verificação:** `npm run ci` local, verde, contract test incluso (`cad_core tests passed 292` + `cad_core.contract.test.js: contrato de kMmolL (NaN=ausente, tipo errado=TypeError) e fronteiras OK` + fixtures/abg_core/check_* todos ok). Nenhum limiar clínico mudou; `core/cad_core.js` tem zero diff nesta PR.

## Placar atualizado

| Rodada | Alegação | Veredito | Onde |
|---|---|---|---|
| CI remoto incompleto | procedente | ✅ incorporado | já em #32 (`5a45aad`) |
| Reversão de 3 fixes da autorrevisão | regressão real | ❌ rejeitado | fixes mantidos em #32 |
| Contrato "estrito" de `kMmolL` via `isProvided` | não se sustentou (inconsistência NaN) | ❌ rejeitado | guard original mantido, zero mudança de código |
| Teste de contrato de fronteiras (3,499/3,5/4,999/5,0 + tipos inválidos) | boa prática, valor real | ✅ incorporado, com expectativa de `NaN` corrigida + simetria dos campos obrigatórios testada | `core/cad_core.contract.test.js` nesta PR (#34) |

## Decisão final

**#34 é a PR canônica.** Contém tudo que #32 e #33 acertaram, nada do que #33 errou. Recomendação: mergear #34 (quando os checks remotos saírem de `queued`); fechar #32 e #33 referenciando esta síntese em vez de mergear qualquer uma das duas diretamente — ambas ficariam com o histórico de arbitragem em `FIGHT.md`, mas só a #34 tem a cobertura de teste completa E o guard correto ao mesmo tempo.
