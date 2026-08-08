# Inventário — Fase 0 · Validação retrospectiva (Etapa 0)

Data: 2026-08-08 · Branch: `claude/cad360-fase0-validacao-k3ztek` · Base: `694a1f0` (main)

Mapa verificado do repositório real, contra o que o prompt da Fase 0 pressupõe. Duas
pressuposições do prompt **não existem** neste repo com esses nomes/números — ver
"Discrepâncias" abaixo e `findings.md`.

## 1. Substrato clínico (fonte de verdade)

| Prompt pressupõe | Repo real |
|---|---|
| `kalemia_cad.json` v0.4+ | **não existe** nenhum arquivo com esse nome |
| — | `canon/policy.json` (doutrina JSON, version `CAD360-ApA-2026-07-01`) |
| — | `POLICY` congelada (`Object.freeze`) inline em `core/cad_core.js:3-46` |

O motor JS **não lê** `canon/policy.json` em runtime: a `POLICY` vive hardcoded e
congelada dentro de `core/cad_core.js`; `canon/policy.json` é o espelho JSON da mesma
doutrina, e `scripts/check_consistency.js` (passo [1]) quebra o build se os dois
divergirem. Fonte declarada: Umpierrez et al., *Diabetes Care* 2024;47(8):1257–1275.

`canon/policy.json` contém ainda campos que a `POLICY` do core não carrega
(`potassium.restartInsulinAboveMmolL`, `bicarbonate.noBenefitAbovePh`,
`resolution.glucoseAdjunctMgDl`, `deltaRatio.*`, `osmolality.*`) — o portão compara
apenas a interseção enumerada em `check_consistency.js:28-36`.

## 2. Motor

`core/cad_core.js` (364 linhas, UMD: `module.exports` + `window.CadCore`). Funções
exportadas e assinaturas:

| Função | Entrada (unidades) | Saída |
|---|---|---|
| `round(value, decimals=2)` | número | número (arredondamento com `Number.EPSILON`) |
| `anionGap(na, cl, hco3)` | mmol/L (posicionais) | número |
| `correctedAnionGap(ag, albumin=4.0)` | AG mmol/L; albumina **g/dL** | número (`ag + 2.5*(4.0-alb)`) |
| `deltaRatio(agc, hco3)` | mmol/L | número; `RangeError` se HCO₃=24 |
| `interpretDeltaRatio(v)` | razão | `{band: "<1"|"1-2"|">2", label, decision}` (fronteiras `<1`, `<=2`) |
| `winter(hco3)` | mmol/L | `{expected, low, high}` (±2) |
| `sodiumCorrectionFactor(glucoseMgDl)` | mg/dL | 1.6, ou 2.4 se glicose **>400** |
| `correctedSodium(na, glucoseMgDl, factor?)` | mmol/L, mg/dL | número |
| `effectiveOsmolality(na, glucoseMgDl)` | Na **medido** mmol/L, mg/dL | `2*na + glu/18` |
| `totalCalculatedOsmolality({na, glucoseMgDl, bunMgDl?, ureaMgDl?})` | mg/dL | efetiva + BUN/2.8 ou ureia/6 (BUN tem precedência) |
| `potassiumPlan(kMmolL)` | mmol/L | `{band, insulin: "hold"|"allowed", potassium, target}`; bandas `<3.5` / `3.5-5.0` / `>=5.0` |
| `insulinPlan({kMmolL, glucoseMgDl})` | mmol/L, mg/dL | `{rateUnitsKgHour: 0|0.05|0.1, action, dextrose, potassium}` |
| `hasDka({knownDiabetes?, glucoseMgDl, betaHydroxybutyrateMmolL?, ketonuriaCruzes?, ph?, hco3?})` | mg/dL, mmol/L, cruzes, pH | boolean; eixos cetônico e ácido são OR; `TypeError` se faltar o par inteiro de um eixo |
| `isResolvedDka({betaHydroxybutyrateMmolL, ph?, hco3?})` | mmol/L, pH | boolean; **exige** βHB sérico |
| `classifyDkaProfile(input)` | objeto (ver abaixo) | `{insufficient, missing?}` ou `{insufficient:false, computed{...}, matches[{id, reason}]}` |

Entrada de `classifyDkaProfile`: obrigatórios `na, cl, hco3, glucoseMgDl, ph` +
(`betaHydroxybutyrateMmolL` OU `ketonuriaCruzes`); opcionais `albumin` (default 4.0),
`kMmolL`, `lactateMmolL`, `knownDiabetes`, `suspectedSepsis`, `dialysisDependent`.
Contrato de tipos (fixado em `cad_core.contract.test.js`): `NaN` == "não fornecido"
em qualquer campo; string/objeto/array/±Infinity == `TypeError`. Perfis retornados
(`matches[].id`): `classica`, `euglicemica`, `cad-hhs`, `sepse-lactato`, `dialitica`,
`alcoolica-jejum`, `pre-cad`, `parcial`, `hipercloremica`, mais notas com `id: null`
(Δ/Δ <1, K <3,5, K ≥5,0, osm em dialítico) — ids resolvem contra `content/profiles.json`.

Segundo motor: `core/abg_core.js` (308 linhas) — gasometria geral (Boston/Narins),
`classifyPrimaryDisturbance({ph, pco2, hco3, na?, cl?, albumin?, lactateMmolL?, chronicityHint?})`,
POLICY própria (`ABG-2026-07-05`), reusa `anionGap`/`correctedAnionGap` do cad_core.
O prompt manda portar só `cad_core.js`; ver Discrepância B (a suíte completa inclui os
45 asserts do abg).

## 3. Suíte de testes — contagem REAL

`npm test` = 4 arquivos, runner = `node <arquivo>` com `assert` do Node (sem framework).
Contagem de chamadas reais ao módulo `assert` (medida por instrumentação de
`Module._load`, execução de 2026-08-08):

| Arquivo | Asserções | Conteúdo |
|---|---|---|
| `core/cad_core.test.js` | **71** | calculadoras, Δ/Δ, osm, Na corrigido, K, diagnóstico/resolução, classifyDkaProfile, anti-drift vs lote1 |
| `core/cad_core.contract.test.js` | **27** | contrato NaN/tipos/fronteiras de kMmolL |
| `core/fixtures.test.js` | **12** | recomputa `core/fixtures.json` (4 Δ/Δ ×2 + 2 osm + 2 K) |
| `core/abg_core.test.js` | **45** | gasometria (motor abg, fora do escopo declarado do porte) |
| **Total** | **155** | |

**Não existem 292 asserções.** O output `cad_core tests passed 292` que aparenta ter
originado o número é `round(effectiveOsmolality(136, 360), 1)` = **292.0** — uma
osmolaridade impressa no log (`cad_core.test.js:286`), não uma contagem. O "292
asserções" do `CLAUDE.md` e do prompt da Fase 0 é uma leitura equivocada desse log.
Escopo cad_core puro (sem abg): 71+27+12 = **110**.

## 4. Gate de consistência

`scripts/check_consistency.js` — 7 passos: [1] POLICY==policy.json (interseção),
[2] bandas do core, [3] deltaRatio/osm no canon, [4] pranchas lote1/lote2,
[5] osm de exercícios usa Na medido, [6] app sem instrução obsoleta,
[7] bloco `id=canon` do app deep-equal à POLICY. `npm run ci` = `npm test` + esse
portão + demais checks. CI verde no estado atual (155/155 + consistência OK).

## 5. Ambiente

Node v22.22.2 · Python 3.11.15 · PyYAML 6.0.1 ✓ · pytest **ausente** (gate de
paridade será executável com `python3` puro; compatível com pytest se instalado).

## Discrepâncias que bloqueiam a Etapa 1 (perguntadas ao dono antes de prosseguir)

- **(A) Substrato**: `kalemia_cad.json` não existe. Candidato real a "fonte única
  consumida sem cópia": `canon/policy.json`. Nota: o motor JS **não** o consome em
  runtime (POLICY inline); um porte Python que o leia estará consumindo a fonte
  espelhada — equivalente por força do portão [1], mas não literalmente "o mesmo
  arquivo que o motor JS lê".
- **(B) Meta de paridade**: "292/292" é inatingível por não existir. Real: 155
  (suíte completa, inclui abg_core) ou 110 (só cad_core, escopo literal da Etapa 1).
