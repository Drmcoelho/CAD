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

## Resumo para assinatura

| Caso | Confronto dominante | Rótulo sugerido pelo confronto mecânico* |
|---|---|---|
| CASO-001 | perfil ✔, condutas comparáveis ✔ | — |
| CASO-002 | travou; bicarbonato fora do gatilho (7,2 vs <7,0) ✖ | — |
| CASO-003 | perfil ✔, bicarbonato dentro do gatilho ✔ | — |
| CASO-004 | perfil ✖ (F-007), condutas ✔ | — |
| CASO-005 | rótulo ✖ / conduta crítica ✔ (F-006 no meio) | — |

\* Coluna deliberadamente vazia: o rótulo é seu. Os símbolos acima são
descrição mecânica do confronto, não julgamento clínico.
