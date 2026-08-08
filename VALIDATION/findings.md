# Findings — Fase 0 (registro de obstáculos e achados, sem correção)

Regra desta fase: achado se registra aqui e segue-se em frente; nada de corrigir
POLICY, motor JS ou doutrina. Adjudicação clínica é do dono.

## F-001 · `kalemia_cad.json` não existe no repositório

- **O que o prompt pressupõe:** substrato clínico em `kalemia_cad.json` (v0.4+),
  consumido pelo motor e a ser consumido pelo porte Python "sem cópia".
- **O que foi verificado:** busca por glob em todo o repo (2026-08-08) — nenhum
  arquivo com esse nome. A fonte de verdade real é o par `core/cad_core.js`
  (POLICY congelada inline, versão `CAD360-ApA-2026-07-01`) + `canon/policy.json`
  (espelho JSON), com `scripts/check_consistency.js` quebrando o build se divergirem.
- **Implicação:** o porte Python não pode "consumir o MESMO kalemia_cad.json".
  Proposta levada ao dono: consumir `canon/policy.json` como fonte de POLICY
  (arquivo real de doutrina, sem criar cópia), com paridade validada contra o
  comportamento do motor JS.
- **Status:** RESOLVIDO 2026-08-08 — dono aprovou: o porte Python consome
  `canon/policy.json` como fonte única de POLICY, com paridade comportamental
  validada contra o motor JS.

## F-002 · As "292 asserções" não existem; a suíte real tem 155

- **O que o prompt (e o CLAUDE.md) afirmam:** "suíte de testes com 292 asserções";
  gate de paridade "292/292".
- **O que foi verificado:** contagem instrumentada de chamadas reais ao módulo
  `assert` do Node durante `npm test` (interceptação de `Module._load`, 2026-08-08):
  71 (`cad_core.test.js`) + 27 (`cad_core.contract.test.js`) + 12 (`fixtures.test.js`)
  + 45 (`abg_core.test.js`) = **155**. O número 292 vem do log
  `cad_core tests passed 292`, onde 292 é `round(effectiveOsmolality(136, 360), 1)`
  — uma osmolaridade efetiva impressa por `cad_core.test.js:286`, não uma contagem.
- **Implicação:** o critério de aceite "292/292" é literalmente inatingível.
  Critério honesto: N/N sobre a contagem real, com N documentado e reproduzível.
  Não é bug clínico — é discrepância documental (CLAUDE.md/prompt); a correção do
  CLAUDE.md fica fora do escopo desta sessão (arquivo fora da lista de entregáveis).
- **Status:** RESOLVIDO 2026-08-08 — dono aprovou: gate de paridade sobre a
  suíte completa, **155/155**, incluindo o porte de `core/abg_core.js`.

## F-003 · POLICY do abg_core não tem espelho JSON

- **O que foi verificado:** a POLICY da gasometria (`ABG-2026-07-05`) vive
  apenas inline em `core/abg_core.js:35-56`; não há entrada correspondente em
  `canon/policy.json` (que cobre só a doutrina de CAD).
- **Implicação:** o porte Python de abg não tem arquivo-fonte para "consumir sem
  cópia"; `pyengine/abg_engine.py` carrega um espelho literal da POLICY JS,
  validado por deep-equal bidirecional no gate de paridade (não é fonte nova de
  doutrina — é porte). Criar o espelho JSON no canon seria mudança fora do
  escopo desta fase; fica registrado para o dono decidir depois.
- **Status:** registrado; sem ação nesta fase.
