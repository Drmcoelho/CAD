# Tabela de validação retrospectiva — Fase 0

Gerada por `VALIDATION/runner.py` (determinístico; ver `results/logs/` para a
trilha integral por caso). Julgamento concordante/divergente é do dono —
linhas nascem PENDENTE_ADJUDICACAO; o runner só marca o mecânico.
Substrato: policy `CAD360-ApA-2026-07-01`.

| caso | braco | dados_disponiveis_pct | recomendacao_motor | conduta_relatada | classificacao | desfecho | observacoes |
|---|---|---|---|---|---|---|---|
| PIPE-001_SYNTHETIC [SYNTHETIC] | acuracia | 67% | t0: classica; K <3.5→insulina hold; t14: resolvida | insulina adiada por K; insulina 0.1 U/kg/h; reduzida+dextrose; K reposto antes da insulina; sem bicarbonato | motor_degradou · PENDENTE_ADJUDICACAO | resolução em 14h |  |
| PIPE-001_SYNTHETIC [SYNTHETIC] | executabilidade_UPA | 56% | t0: classica; K <3.5→insulina hold; t14: resolução INDETERMINADA (sem βHB) | insulina adiada por K; insulina 0.1 U/kg/h; reduzida+dextrose; K reposto antes da insulina; sem bicarbonato | motor_degradou · PENDENTE_ADJUDICACAO | resolução em 14h | mascarados na UPA: betaHydroxybutyrateMmolL, lactateMmolL |

**1 caso(s) SINTÉTICO(S) de pipeline na tabela — não são dados de validação.**
