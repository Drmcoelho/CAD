# VALIDATION — Fase 0 · Validação retrospectiva do CAD 360

Aparato para validar o motor determinístico do CAD 360 contra relatos de caso
publicados. **Esta fase construiu o aparato; a validação em si ainda não
começou** — depende dos relatos reais que o dono fornecerá (5 no piloto, meta
30). Governança: regime não-SaMD, humano-no-loop; todo julgamento clínico é do
dono (Dr. Matheus M. Coelho).

## Rodar tudo em três comandos

```bash
npm run ci                              # 1) sanidade do repo: suíte JS + portão de fonte única
python3 pyengine/tests/test_parity.py   # 2) gate de paridade JS↔Python (155/155; exige node)
python3 VALIDATION/runner.py            # 3) executa os casos → results/table.{md,csv} + logs/
```

Pré-requisitos: Node ≥20, Python ≥3.11, PyYAML (única dependência fora da
stdlib; `pytest` é opcional — o gate roda com `python3` puro). Sem rede em
nenhuma execução.

## Estado atual (2026-08-08)

| Item | Estado |
|---|---|
| Inventário do repo real | `inventory.md` — feito |
| Porte Python dos motores | `pyengine/cad_engine.py` + `abg_engine.py` — feito |
| Gate de paridade | **fechado: 155/155 asserções · 158/158 invocações idênticas · 0 tolerâncias** (`parity_report.md`) |
| Schema de caso | `case_schema.yaml` v0.1 — **aprovado pelo dono** em 2026-08-08 |
| Runner + braços acurácia/UPA | `runner.py` — funciona ponta a ponta, determinístico |
| Caso sintético de pipeline | `cases_synthetic/PIPE-001_SYNTHETIC.yaml` — roda nos 2 braços |
| **Casos reais** | **10/30 extraídos de relatos publicados** (PMC texto completo, citação+DOI+PMID em cada YAML) |
| Schema | **v0.2** — classe `derivado_aritmetico` (F-004 decidido pelo dono 2026-08-10) |
| Adjudicação | toda linha nasce `PENDENTE_ADJUDICACAO` — campo do dono; **20 linhas aguardando** (`adjudication.md` é o dossiê) |

Atenção a dois desvios do protocolo original, ambos verificados e decididos
pelo dono (detalhe em `findings.md`): o substrato é `canon/policy.json` (não
existe `kalemia_cad.json`) e a suíte tem **155** asserções reais, não 292 (o
"292" era uma osmolaridade impressa no log do teste).

## Layout

```
VALIDATION/
├── README.md              ← este arquivo
├── inventory.md           ← Etapa 0: mapa verificado do repo
├── findings.md            ← obstáculos/achados (F-001..F-003), sem correções
├── parity_report.md       ← Etapa 2: relatório do gate de paridade
├── case_schema.yaml       ← Etapa 3: schema aprovado (v0.1), com exemplo comentado
├── runner.py              ← Etapa 4: executa casos, emite tabela + logs
├── cases/                 ← casos REAIS extraídos de relatos publicados (CASO-001..005)
├── cases_synthetic/       ← casos sintéticos de pipeline (sufixo _SYNTHETIC obrigatório)
└── results/
    ├── table.md / table.csv   ← uma linha por caso × braço
    └── logs/<caso>__<braço>.json  ← input integral, trilha de decisão, hash do substrato
pyengine/
├── cad_engine.py          ← porte de core/cad_core.js (POLICY de canon/policy.json)
├── abg_engine.py          ← porte de core/abg_core.js (POLICY espelhada — F-003)
└── tests/
    ├── js_trace_harness.js    ← captura invocações + asserções da suíte JS real
    ├── parity_trace.json      ← trace gerado (não editar à mão)
    └── test_parity.py         ← o gate (python3 puro; compatível com pytest)
```

## Piloto (5 casos, extraídos 2026-08-08)

| Caso | Fenótipo | Fonte (DOI) | Resultado mecânico |
|---|---|---|---|
| CASO-001 | euglicêmica/SGLT2 (empagliflozina) | 10.1016/j.amsu.2022.104879 | executou: perfil `euglicemica`, K ≥5,0→ECG; resolução indeterminada (sem βHB) |
| CASO-002 | dialítica (DRC em HD + ITU) | 10.7759/cureus.42700 | travou: Cl não relatado + cetonúria sem cruzes |
| CASO-003 | euglicêmica jejum/pancreatite alcoólica | 10.1007/s11606-022-07993-5 | travou: Cl não relatado (AG 28 publicado — F-004) |
| CASO-004 | CAD+HHS mista pediátrica | 10.7759/cureus.28983 | travou: Cl não relatado (AG 31 publicado — F-004) |
| CASO-005 | cetoalcalose (CAD mascarada por vômitos) | 10.1002/ccr3.8250 | executou: `pre-cad` + hold por K 2,5; abg pega o gap mascarado; Δ/Δ −0,42 (F-006) |

Expansão 2026-08-10 (schema v0.2, Cl derivado onde o AG foi publicado):

| Caso | Fenótipo | Fonte (DOI) | Resultado mecânico |
|---|---|---|---|
| CASO-006 | euglicêmica glicose 84 (ITU) | 10.7759/cureus.10065 | travou: cetonemia sem unidade declarada |
| CASO-007 | euglicêmica gestacional (USP) | 10.5811/cpcem.2019.9.43624 | travou: Na/Cl/K não publicados (19% de dados) |
| CASO-008 | HHS puro, estreia de DM1, 17a | 10.6065/apem.2142002.001 | travou: Cl/K não publicados; osm do relato não reproduz |
| CASO-009 | cetose 8,5 sem acidose + hiperosmolar | 10.7759/cureus.14125 | travou: pH de admissão não publicado (F-005) |
| CASO-010 | AKA×CAD, pH 6,72, lactato 23 | 10.1002/ams2.660 | executou: `sepse-lactato`; bicarbonato retido <7,0 (✖ canon) |

Achados da extração: F-004 (**decidido**: derivação aritmética autorizada, schema
v0.2 — destravou CASO-003/004), F-005 (perfil exige pH; agora com 2 exemplares
reais), F-006 (Δ/Δ denominador negativo — guarda especificada para fase futura),
F-007 (sem rota para HHS dominante — CASO-004/008/009). Detalhe em `findings.md`.

## Fluxo para adicionar um caso real

1. Extrair o relato para `VALIDATION/cases/CASO-NNN.yaml` seguindo
   `case_schema.yaml`: valores exclusivamente do relato, ausente = `null`
   (nunca imputar), unidades canônicas (conversões anotadas em `observacoes`),
   `disponibilidade` marcando o que não existiria numa UPA.
2. `python3 VALIDATION/runner.py` — regenera tabela e logs (determinístico;
   diffs limpos no git).
3. O dono adjudica: preencher `adjudicacao.classificacao`
   (`concordante`/`divergente`) e `notas` no YAML do caso; re-rodar o runner
   para a tabela refletir.
4. Achou algo estranho no motor durante a extração? **Não corrigir** — registrar
   em `findings.md` e seguir (a POLICY é imutável nesta fase).

## Braços de análise

- **acurácia** — pontos temporais com os labs exatamente como no relato.
- **executabilidade_UPA** — mesmos pontos re-executados mascarando (→ null) os
  campos `ausente_no_cenario_UPA`, quantificando o custo decisório do
  laboratório incompleto de UPA. No caso sintético, o custo já aparece: sem
  βHB sérico a resolução vira INDETERMINADA (cetonúria não confirma resolução
  — doutrina do canon).

O runner marca automaticamente apenas o mecânico: `motor_travou_por_dado_ausente`
(motor recusou o ponto — `insufficient`), `motor_degradou` (rodou com incerteza
declarada: sem βHB, albumina em default 4,0, sem K, sem pCO₂) ou
`executou_completo`. Concordância/divergência é julgamento clínico — sempre do
dono, nunca do runner nem de assistente.

## Reprodutibilidade

- Sem rede, sem relógio, sem aleatoriedade em qualquer script desta fase.
- Cada log carrega SHA-256 de `canon/policy.json`, `core/cad_core.js` e dos
  motores Python — a saída é rastreável ao substrato exato.
- Re-execuções produzem bytes idênticos (verificado por sha256sum na Etapa 4).
- O trace de paridade guarda os hashes do substrato; `test_parity.py` falha se
  o repo mudou desde a geração (regenerar com node é o caminho normal).
