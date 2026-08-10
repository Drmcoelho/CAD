# Decisão única — Fase 0

`decisao-unica-fase0.html` é o formulário de adjudicação: abre offline no
navegador (single-file, sem rede), reúne **38 decisões** do dono e gera **uma
resposta única em YAML** para colar de volta na sessão.

| Bloco | Itens | O que decide |
|---|---|---|
| A · estruturais | 4 | F-006 (guarda do Δ/Δ), F-007 (rota HHS), F-008 (`convertido_de_escala` v0.3), máscara UPA |
| B · ratificações | 4 | decisões de formato marcadas como revisáveis na extração (CASO-014, -021, -027, -029) |
| C · adjudicações | 30 | `concordante` / `divergente` / `nao_avaliavel` + notas, um por caso |

Cada cartão traz o confronto factual já resumido (motor × conduta relatada) e o
link DOI do relato. As respostas ficam em `localStorage` enquanto se preenche;
o YAML sai por **Gerar / Copiar / Baixar**.

## Como aplicar a resposta

1. Preencher e gerar o YAML.
2. Colar na sessão: os campos `adjudicacao.classificacao` e `adjudicacao.notas`
   entram nos YAMLs de `VALIDATION/cases/`, e as decisões estruturais viram
   schema v0.3 (se F-008 autorizado) + entradas de roadmap em `findings.md`.
3. `python3 VALIDATION/runner.py` — a tabela passa a exibir a adjudicação em
   vez de `PENDENTE_ADJUDICACAO`.

Nada aqui decide clínica: o formulário só coleta o julgamento do dono
(Dr. Matheus M. Coelho, CRM-SP 151.318) e o devolve em formato aplicável.
