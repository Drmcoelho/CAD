# Dossiê de adjudicação — piloto Fase 0 (para o dono assinar)

Confronto factual motor × conduta relatada, caso a caso, no braço de acurácia
(pós schema v0.2, com Cl derivado onde autorizado). **Este dossiê não
adjudica**: o rótulo `concordante`/`divergente` é exclusivo do dono (regra
dura da Fase 0). Para assinar: editar `adjudicacao.classificacao` e `notas`
no YAML do caso e re-rodar `python3 VALIDATION/runner.py`.

Convenção das linhas: ✔ = motor e relato apontam a mesma conduta/leitura;
✖ = apontam coisas diferentes; ◐ = não comparável (dado ausente ou fora do
vocabulário de um dos lados). Os símbolos descrevem o confronto mecânico,
não o veredito clínico.

---

## CASO-001 · euglicêmica/SGLT2 (empagliflozina) · DOI 10.1016/j.amsu.2022.104879

| Eixo | Motor (t0) | Relato | |
|---|---|---|---|
| Perfil | `euglicemica` (glicose 190 <250 com critério fechado) | "EDKA secundária a empagliflozina" | ✔ |
| Diagnóstico | hasDka=true (DM conhecido + cetonúria 3+ + pH 7,12) | CAD diagnosticada | ✔ |
| Insulina | liberada (K 5,0 → banda ≥5,0), 0,05 U/kg/h **+ dextrose** (glicose <250) | infusão IV de insulina + hidratação (taxa/dextrose não relatadas) | ◐ |
| Potássio | sem reposição inicial; ECG/recontrole | não relatado | ◐ |
| Δ/Δ | 1,01 → banda 1–2 (AGMA limpa) | AG 25 relatado, sem Δ/Δ | ◐ |
| Resolução | indeterminada sem βHB sérico (cetonúria não confirma resolução) | "resolução gradual, AG normalizado" | ◐ |

Ponto de atenção para o dono: o relato usa taxa de insulina recomendada para
EDKA de 0,02–0,05 U/kg/h na discussão — o motor chega a 0,05 pela via
dextrose/glicose <250. Convergência de número por caminhos distintos.

## CASO-002 · dialítica (DRC em HD + ITU) · DOI 10.7759/cureus.42700

| Eixo | Motor | Relato | |
|---|---|---|---|
| Perfil | **TRAVOU** (Cl não publicado e não derivável — sem AG no relato; cetonúria sem cruzes) | CAD em DRC dialítica | ◐ |
| Insulina (plano isolado) | K 3,5 → banda 3,5–5,0, liberada 0,1 U/kg/h | 0,1 U/kg/h iniciada | ✔ |
| Gasometria (abg) | acidose metabólica + nota de lactato 9,2 | acidose metabólica refratária; lactato alto | ✔ |
| Bicarbonato | doutrina do canon: considerar se pH <7,0 — **pH era 7,2** | NaHCO₃ 100 mEq administrado com pH 7,2 | ✖ |
| Suporte | (fora do vocabulário do motor) | HD de resgate | ◐ |

Ponto de atenção: o único ✖ estrutural do piloto até aqui — bicarbonato dado
acima do gatilho doutrinário (7,2 vs <7,0). O relato o justifica pela DRC
(acidose refratária); adjudicação é sua.

## CASO-003 · euglicêmica jejum/pancreatite alcoólica · DOI 10.1007/s11606-022-07993-5

| Eixo | Motor (t0, Cl derivado=100) | Relato | |
|---|---|---|---|
| Perfil | `euglicemica` (glicose 214 <250, critério fechado: βHB 12,92 + pH 6,99) | "euglycemic DKA por inanição + pancreatite" | ✔ |
| Insulina | liberada (K 3,8), 0,05 U/kg/h + dextrose | drip 3 U/h + D5 associada (peso não relatado) | ◐ |
| Bicarbonato | pH 6,99 <7,0 → dentro do gatilho doutrinário | NaHCO₃ 50 mEq dado | ✔ |
| Δ/Δ | AGc 32,5 (albumina 2,2!) → Δ/Δ 1,14, banda 1–2 | AG 28 sem correção por albumina | ◐ |
| Resolução (t0) | não resolvida (βHB 12,92) | resolveu depois, sem labs publicados | ◐ |

Ponto de atenção: única conduta de bicarbonato do piloto DENTRO do gatilho
pH <7,0 do consenso — contraste direto com o CASO-002.

## CASO-004 · CAD+HHS mista pediátrica · DOI 10.7759/cureus.28983

| Eixo | Motor (t0, Cl derivado=117) | Relato | |
|---|---|---|---|
| Perfil | **`parcial` — zona de trânsito** (F-007: eixo cetônico não fecha βHB 2,7/cetonúria 1+; sem rota p/ HHS fora de dka=true) | "mixed DKA-HHS" (osm 428) | ✖ |
| Osm efetiva | 386 calculada (>320, critério HHS do canon) | osm medida 428 | ✔ |
| Insulina | K 6,1 → banda ≥5,0, liberada 0,1 U/kg/h | 0,1 U/kg/h (protocolo ISPAD) | ✔ |
| Potássio | sem reposição inicial (K ≥5,0) | K nos fluidos de manutenção (após queda) | ◐ |
| Gasometria (abg) | acidose metabólica **+ acidose respiratória combinada** (pCO₂ 51 com HCO₃ 12 — nunca é compensação) | não discutido no relato | ◐ |
| Resolução | t24: pH 7,41/HCO₃ 24, sem βHB → indeterminada | CAD resolvida em 24h; HHS em 96h | ◐ |

Ponto de atenção: o ✖ de perfil é o F-007 (limite de desenho do motor, não
erro de conta) — o abg ainda pegou uma acidose respiratória sobreposta que o
relato não comenta (pCO₂ 51 "alto" numa acidose metabólica). População
pediátrica: doutrina do canon é de adultos; pesar isso na adjudicação.

## CASO-005 · cetoalcalose (CAD mascarada) · DOI 10.1002/ccr3.8250

| Eixo | Motor (t0) | Relato | |
|---|---|---|---|
| Perfil | `pre-cad` (βHB 3,4 cruza limiar; pH 7,50/HCO₃ 37 não fecham eixo ácido) | "CAD mascarada por alcalose de vômitos" | ✖ |
| Gap mascarado | abg: "AGc 17,5 elevado apesar de HCO₃ 37 — gap alto mascarado" | exatamente a tese do relato | ✔ |
| Insulina | **adiar — K 2,5 <3,5; repor K primeiro** | insulina só após K subir a 3,8 com reposição IV | ✔ |
| Δ/Δ | −0,42 rotulado "<1 hiperclorêmico" (F-006 — fora do domínio da fórmula) | n/a | ✖ |
| Resolução | t18 trava por pH ausente (F-005); βHB 0,7 ≥0,6 | resolvido às ~18h (AG 7, βHB 0,7) | ◐ |

Ponto de atenção: o caso-síntese do piloto. O rótulo formal diverge
(`pre-cad` × CAD mascarada) porque o critério 2024 exige o eixo ácido — mas
a conduta crítica (hold de insulina por K) e a leitura do gap mascarado
convergem perfeitamente. O abg_core acerta onde a nota de Δ/Δ do perfil erra
(F-006). Também vale notar: βHB 0,7 às 18h não fecha resolução formal
(<0,6) — o relato deu alta no dia 3.

---

## Expansão (CASO-006..010, extraídos 2026-08-10)

**CASO-006** · euglicêmica glicose 84 (DM má-adesão + ITU) · DOI 10.7759/cureus.10065
Motor trava: cetonemia publicada como "1.39" **sem unidade** → eixo cetônico sem
insumo (mesma regra que excluiu o caso do alpelisibe). Conduta: insulina "0.14/kg/h"
(acima do 0,1 doutrinário — possível typo do relato, transcrito como publicado);
acidose PIOROU no controle de 8h (HCO₃ 6,4→4,9). Painel t0 completo com Cl 107 —
se o dono aceitar a cetonemia como mmol/L, o caso destrava (decisão sua).

**CASO-007** · euglicêmica gestacional 34 sem (USP, cenário brasileiro) · DOI 10.5811/cpcem.2019.9.43624
Motor trava: Na/Cl/K não publicados + cetonúria "strongly positive" sem cruzes.
Apenas 19% dos insumos disponíveis — o relato mais esparso do conjunto. Conduta
convergente com o canon: dextrose desde o início, sem bicarbonato, K antes de
titular insulina. Desfecho com cesárea de emergência às 22h.

**CASO-008** · HHS puro como estreia de DM1, 17a (F-007 direto) · DOI 10.6065/apem.2142002.001
Motor trava (Cl/K não publicados; AG não publicado → não derivável). Se rodasse:
glicose 1456 + cetonúria 1+ → mesmo padrão F-007 do CASO-004 (sem rota p/ HHS).
Bônus de adjudicação: a "osm efetiva 323" publicada NÃO reproduz pela fórmula do
canon (2·143 + 1456/18 = 366,9) — aritmética do próprio relato em cheque.
Conduta: insulina 0,1→0,025 U/kg/h (doutrina pediátrica de HHS).

**CASO-009** · "HHS" com βHB 8,5 e HCO₃ 24 (pós-vacina, DM2 novo) · DOI 10.7759/cureus.14125
Motor trava no t0: **pH da admissão não publicado** (a gasometria da tabela é
"during hospitalization", sem timestamp) — F-005 em estado puro. Painel tinha Cl
95 direto. Cetose franca (βHB 8,5, AG 25) SEM acidose (HCO₃ 24): com pH, o motor
diria pré-CAD/HHS — rótulo do relato é HHS. Osm medida 371.

**CASO-010** · AKA×CAD: pH 6,724, lactato 23, DM1, cegueira transitória · DOI 10.1002/ams2.660
**Motor RODA**: perfil `sepse-lactato` (lactato ≥4 domina), K 5,8 → insulina
liberada 0,1 U/kg/h; Δ/Δ 1,63 (banda 1–2). Relato rotula cetoacidose ALCOÓLICA
(razão βHB/AcAc 7,5:1) apesar de DM1 + glicose 307 — a fronteira AKA×CAD é sua.
Confronto de bicarbonato: pH 6,724 (**abaixo do gatilho <7,0 do canon**) e o
relato RETEVE bicarbonato pela estabilidade circulatória — PCR em AESP 5h depois,
revertida com bicarbonato. O caso-espelho do CASO-002 (que deu bicarbonato ACIMA
do gatilho): os dois lados do desvio doutrinário no mesmo piloto.

## Lote 3 (CASO-011..013, extraídos 2026-08-10)

**CASO-011** · CAD clássica (KPDM pós-bariátrica, glicose 504) · DOI 10.3389/fendo.2018.00812
**Motor RODA** — o primeiro caso francamente hiperglicêmico do conjunto que
executa: perfil `cad-hhs` (glicose ≥500 dispara a bandeira de sobreposição;
osm efetiva 284 <320 — o gatilho foi a glicose isolada), K 4,8 → insulina
liberada 0,1 U/kg/h, Δ/Δ 0,5 → nota de componente hiperclorêmico. Relato trata
como CAD simples de diabetes propensa à cetose. Confronto: a bandeira cad-hhs
do motor com osm normal-alta é útil ou ruído? Adjudicação sua.

**CASO-012** · EDKA dieta cetogênica + SGLT2i suspenso · DOI 10.1155/2022/4101975
Motor trava: **nenhum pH publicado no relato inteiro** (só HCO₃ venoso 6) —
terceiro exemplar do F-005. Cetonúria 3+ publicada; AG 29 consistente.
Conduta convergente (insulina + dextrose desde o início). Internação em
enfermaria, não UTI.

**CASO-013** · EDKA empagliflozina, painel completo + gasometria arterial · DOI 10.7759/cureus.30106
Motor trava pelo eixo cetônico apesar do painel rico: cetonúria ">80 mg/dL"
sem escala em cruzes (F-008 — mapeamento de kit não é identidade aritmética).
Se o dono autorizar `convertido_de_escala` (v0.3), o caso destrava.

## Lote 4 (CASO-014..015, extraídos 2026-08-10)

**CASO-014** · EDKA + sepse MRSA em empagliflozina · DOI 10.7759/cureus.87029
**Motor RODA** (Cl derivado 98 via AG 31): perfil `euglicemica+sepse-lactato` —
primeira vez que a bandeira de sepse dispara (via contexto clínico; lactato era
NORMAL, 1,7). Confronto de taxa: motor recomenda 0,05 U/kg/h + dextrose
(glicose 209 <250); relato usou 0,1 U/kg/h. Ressalva de extração: "ketone
levels 4.5 mmol/L" sem ensaio nomeado, extraído como βHB (revisável — F-008).

**CASO-015** · CAD pediátrica gravíssima (pH 6,75) com mielinólise pontina · DOI 10.1155/2018/4273971
Motor trava (F-008: βHB "11.41" sem unidade; cetonúria sem cruzes) apesar de
Cl derivável (109). O confronto central é de conduta: NaHCO₃ 50 mEq em bolus
com pH 6,75 — **dentro** do gatilho <7,0 do canon adulto, mas em população
pediátrica onde a literatura (e o próprio relato) associa bicarbonato a edema
cerebral; desfecho: edema cerebral + CPM + HSD, recuperação quase completa.
Terceiro vértice do triângulo do bicarbonato no corpus: CASO-002 deu acima do
gatilho, CASO-010 reteve abaixo, CASO-015 deu dentro — e é o caso pediátrico.

## Resumo para assinatura

| Caso | Confronto dominante | Rótulo sugerido pelo confronto mecânico* |
|---|---|---|
| CASO-001 | perfil ✔, condutas comparáveis ✔ | — |
| CASO-002 | travou; bicarbonato fora do gatilho (7,2 vs <7,0) ✖ | — |
| CASO-003 | perfil ✔, bicarbonato dentro do gatilho ✔ | — |
| CASO-004 | perfil ✖ (F-007), condutas ✔ | — |
| CASO-005 | rótulo ✖ / conduta crítica ✔ (F-006 no meio) | — |
| CASO-006 | travou (cetonemia sem unidade); decisão de unidade é sua | — |
| CASO-007 | travou (19% de dados); condutas convergem com canon ✔ | — |
| CASO-008 | travou; osm efetiva do relato não reproduz pela fórmula ✖ | — |
| CASO-009 | travou (pH de admissão não publicado — F-005) | — |
| CASO-010 | perfil ✖ (AKA×CAD) / bicarbonato retido com pH <7,0 ✖ | — |
| CASO-011 | roda: cad-hhs por glicose ≥500 × "CAD simples" do relato ✖/◐ | — |
| CASO-012 | travou (nenhum pH publicado — F-005) | — |
| CASO-013 | travou (cetonúria em mg/dL sem cruzes — F-008) | — |
| CASO-014 | roda: euglicemica+sepse-lactato; taxa 0,05 (motor) × 0,1 (relato) | — |
| CASO-015 | travou (βHB sem unidade — F-008); bicarbonato DENTRO do gatilho, pediátrico ✖/◐ | — |

\* Coluna deliberadamente vazia: o rótulo é seu. Os símbolos acima são
descrição mecânica do confronto, não julgamento clínico.
