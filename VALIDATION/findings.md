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

## F-004 · Relatos publicados frequentemente omitem o cloro → motor trava

- **O que foi verificado:** no piloto de 5 casos extraídos de relatos
  publicados (2026-08-08), **3/5 não relatam o Cl sérico** (CASO-002, -003,
  -004), embora dois deles publiquem o próprio anion gap (CASO-003: AG 28;
  CASO-004: AG 31). `classifyDkaProfile` exige `cl` → `insufficient` →
  `motor_travou_por_dado_ausente` nesses casos, nos dois braços.
- **Questão metodológica PENDENTE com o dono:** quando o relato dá Na, HCO₃ e
  AG, o Cl é derivável por aritmética (Cl = Na − HCO₃ − AG; ex.: CASO-003 →
  100; CASO-004 → 117). A extração desta fase NÃO derivou (regra "nunca
  imputar" lida na forma estrita); os valores deriváveis estão anotados nas
  `observacoes` de cada caso. Se o dono autorizar a derivação determinística
  como classe distinta (`derivado_aritmetico`, nem medido nem imputado), os 3
  casos destravan e o schema ganha essa marcação em v0.2.
- **Status:** DECIDIDO 2026-08-10 — dono autorizou ("Quero tudo"). Schema
  v0.2 implementa `derivado_aritmetico` (só identidade aritmética, fórmula
  registrada, estampado em toda saída). Aplicado: CASO-003 (Cl=100) e
  CASO-004 t0 (Cl=117). CASO-002 segue travado (AG não publicado) e
  CASO-004 t24 segue null (AG não publicado no ponto — regra do mesmo ponto).

## F-005 · `classifyDkaProfile` exige pH mesmo quando HCO₃ bastaria

- **O que foi verificado:** CASO-005 t=18h tem HCO₃ 28 + βHB 0,7 + painel
  completo, mas pH não repetido → o perfil trava (`missing: [ph]`), embora
  `hasDka`/`isResolvedDka` aceitem o eixo ácido por pH **OU** HCO₃. É contrato
  do motor (`req = [na, cl, hco3, glucoseMgDl, ph]`), não bug de porte — o
  Python reproduz o JS exatamente (paridade 158/158).
- **Implicação:** pontos de seguimento sem gasometria repetida (comuns em
  relato e em UPA) travam o perfil mesmo com resolução avaliável. Decisão de
  afrouxar o contrato é clínica/arquitetural → do dono, fora desta fase.
- **Status:** registrado; sem ação nesta fase.

## F-006 · Δ/Δ com HCO₃ >24 produz banda "<1" enganosa (denominador negativo)

- **O que foi verificado:** CASO-005 t0 (cetoalcalose: HCO₃ 37) → deltaRatio
  = (AGc−12)/(24−37) = **−0,42** → `interpretDeltaRatio` devolve banda "<1 —
  componente hiperclorêmico associado". Em alcalose com gap mascarado a
  leitura correta é o oposto (o abg_core, aliás, acerta: "AGc 17.5 elevado
  apesar de HCO₃ 37 não estar baixo — gap alto mascarado"). A fórmula Δ/Δ
  pressupõe HCO₃ <24; o core não guarda essa pré-condição (só o caso HCO₃=24).
- **Implicação:** nota de Δ/Δ do `classifyDkaProfile` pode contradizer o
  próprio abg_core no mesmo paciente. Registrado como achado de fronteira de
  validade — **não corrigido** (POLICY/lógica imutáveis nesta fase).
- **Status:** dono sinalizou intenção de tratar (2026-08-10). O core segue
  intocado nesta fase (congelamento da Fase 0). **Proposta especificada para
  fase futura** (a implementar com o gate regulatório interno de mudança de
  doutrina): `deltaRatio(agc, hco3)` ganhar guarda de pré-condição para
  HCO₃ ≥24 — devolvendo indicador explícito de "fora do domínio da fórmula"
  em vez de razão com denominador negativo — e `classifyDkaProfile` suprimir
  a nota de Δ/Δ nesse domínio, deferindo ao abg_core (que já lê o cenário
  corretamente como gap alto mascarado). Muda comportamento de saída → exige
  novo ciclo de testes + consistência + adjudicação clínica do dono.

## F-007 · Cadeia de perfis não tem rota para HHS dominante sem critério de CAD

- **O que foi verificado:** CASO-004 t0 (glicose 1188, Na 160, osm efetiva
  calculada 386 — muito acima do limiar HHS 320 do canon) sai do
  `classifyDkaProfile` como **"parcial — zona de trânsito"**. Mecanismo: o
  eixo cetônico do critério 2024 não fecha (βHB 2,7 <3,0; cetonúria 1+ <2+),
  logo `hasDka=false`; o ramo `cad-hhs` só existe DENTRO de `dka==true`; o
  ramo `!dka && !ketoneAxis && acidAxis` cai em "parcial/hipercloremica",
  pensado para cauda de tratamento — não para HHS de apresentação.
- **Implicação:** o motor é fiel ao critério formal de CAD, mas não tem
  vocabulário para "HHS puro/dominante" — num caso em que a osm efetiva que
  ele próprio calcula (386) grita HHS. Rotular apresentação hiperosmolar
  catastrófica de "zona de trânsito" é o tipo de saída que o dono precisa
  adjudicar como divergência de desenho, não de cálculo.
- **Status:** registrado 2026-08-10; sem correção nesta fase (congelamento).
  Candidata natural à mesma fase futura do F-006.
