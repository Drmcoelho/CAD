# Relatório de paridade JS↔Python — Fase 0 · Etapa 2

Data da execução registrada: 2026-08-08 · Node v22.22.2 · Python 3.11.15
Gate: `python3 pyengine/tests/test_parity.py` (reproduzível por terceiro; sem rede)

## Resultado

**PARIDADE OK — 155/155 asserções JS verdes · 158/158 invocações reproduzidas
identicamente em Python · 0 usos de tolerância.**

```
substrato: hashes conferidos (core/cad_core.js, core/abg_core.js, canon/policy.json)
suíte JS verde sob o harness: cad_core.test.js=71, cad_core.contract.test.js=27, fixtures.test.js=12, abg_core.test.js=45 — total 155
POLICY cad: todas as folhas do core JS presentes e idênticas em canon/policy.json
POLICY abg: deep-equal bidirecional OK
replay: 158/158 invocações idênticas
usos de tolerância 1e-9: NENHUM (igualdade exata em todos os números)

PARIDADE: OK — 155/155 asserções JS verdes; 158/158 invocações reproduzidas identicamente em Python
```

## Sobre a meta ("292/292")

O critério original da Fase 0 pedia "292/292", número que **não existe** na
suíte (é a osmolaridade efetiva `effectiveOsmolality(136, 360) = 292.0` impressa
no log do teste — ver `VALIDATION/findings.md` F-002). A contagem real, medida
por instrumentação do módulo `assert` durante `npm test`, é **155**; o dono
aprovou em 2026-08-08 o gate sobre a suíte completa (155/155, incluindo os 45
asserts do `abg_core`, além do escopo literal de porte que seria 110).

## Método

As 155 asserções JS são código imperativo (funções com `assert` do Node), não
dados extraíveis — então o gate usa a via de harness prevista no protocolo:

1. `pyengine/tests/js_trace_harness.js` executa a suíte oficial intacta
   (mesma ordem do `npm test`), interceptando `Module._load` para (a) contar
   cada chamada real ao `assert` e (b) registrar cada invocação de função dos
   motores (`core/cad_core.js`, `core/abg_core.js`) — argumentos, resultado ou
   exceção — delegando ao motor real. Qualquer asserção vermelha aborta o
   harness; o trace só existe com a suíte 100% verde.
2. O trace (`pyengine/tests/parity_trace.json`, gerado — 158 invocações: as
   chamadas diretas dos testes mais as chamadas internas do abg ao cad, que o
   proxy também captura) carrega os SHA-256 do substrato e as POLICYs reais dos
   dois motores.
3. `pyengine/tests/test_parity.py` regenera o trace, confere os hashes, valida
   as POLICYs (cad: toda folha da POLICY JS idêntica em `canon/policy.json`;
   abg: deep-equal bidirecional com o espelho Python — F-003) e re-executa cada
   invocação no motor Python, exigindo identidade valor a valor: números por
   igualdade exata de double, strings byte a byte, exceções por tipo mapeado
   (TypeError→TypeError, RangeError→ValueError) e mensagem idêntica.

Encadeamento que fecha o gate: as 155 asserções passaram sobre os resultados
JS; os resultados Python são idênticos aos JS em todas as 158 invocações
(inclusive as 10 exceções de contrato); logo as mesmas 155 asserções valem para
o motor Python.

## Tolerância de ponto flutuante

Protocolo permite até 1e-9, com uso obrigatoriamente listado aqui.
**Usos: NENHUM.** Todos os números compararam por igualdade exata de IEEE-754
(operações portadas na mesma ordem; `Math.round` do JS reimplementado conforme
a spec ECMAScript, incluindo empate para +∞ e o caso 0.49999999999999994).

## Cobertura por função (invocações capturadas da suíte)

| Função | Invocações | | Função | Invocações |
|---|---|---|---|---|
| cad.classifyDkaProfile | 29 | | cad.potassiumPlan | 5 |
| cad.round | 57 | | cad.hasDka | 5 |
| abg.classifyPrimaryDisturbance | 18 | | cad.isResolvedDka | 5 |
| cad.anionGap | 6 | | cad.effectiveOsmolality | 5 |
| cad.correctedAnionGap | 6 | | cad.insulinPlan | 4 |
| cad.deltaRatio | 6 | | cad.sodiumCorrectionFactor | 2 |
| cad.interpretDeltaRatio | 6 | | cad.winter · cad.correctedSodium · cad.totalCalculatedOsmolality · abg.expectedPco2MetabolicAcidosis | 1 cada |

Dez invocações são exceções esperadas de contrato (tipos inválidos, eixos
ausentes), reproduzidas com o mesmo tipo mapeado e a mesma mensagem.

## Como reproduzir

```bash
python3 pyengine/tests/test_parity.py          # regenera o trace via node e replica
python3 pyengine/tests/test_parity.py --no-regen  # usa o trace commitado (hashes conferidos)
```

O gate falha (exit 1) se: a suíte JS quebrar, os hashes do substrato divergirem
do trace, qualquer folha de POLICY divergir, ou qualquer invocação não
reproduzir identicamente.
