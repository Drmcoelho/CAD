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
- **Status:** PERGUNTADO ao dono no checkpoint da Etapa 0. → Resposta: aprovado
  consumir `canon/policy.json` (ver decisão registrada no commit da Etapa 1).

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
- **Status:** PERGUNTADO ao dono no checkpoint da Etapa 0 (paridade sobre 155
  completa ou 110 só-cad_core).
