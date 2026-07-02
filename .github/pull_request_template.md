<!--
CAD 360 — a diretriz-mãe é fonte única: nenhum número clínico nasce hardcoded.
Todo limiar vem de core/cad_core.js + canon/policy.json; o resto é saída renderizada.
-->

## O que muda

<!-- uma linha por mudança; o porquê, não só o quê -->

## Camada tocada

- [ ] `core/` (motor + POLICY) — número clínico mudou aqui **e** no `canon/policy.json`?
- [ ] `canon/policy.json`
- [ ] `app/` · `tratado/` · `painel/` (saídas HTML)
- [ ] `pranchas/` (svg/png/source.json/geradores)
- [ ] `docs/` · scripts · CI · infra

## Checklist do portão de fonte única

- [ ] `npm run ci` passa localmente (testes do core + fixtures + `check_consistency` + links)
- [ ] Nenhum limiar clínico hardcoded em HTML/SVG/parágrafo/pixel — tudo deriva do canon
- [ ] Se mudou um número da doutrina: editado em **um** lugar (`core/` + `canon/`), sem valor velho sobrevivendo em nenhuma camada
- [ ] Operadores de fronteira `≥`/`<` consistentes com o core (nunca `>` onde o core usa `>=`)
- [ ] Render revisado antes de entregar (HTML → desktop + iPhone; SVG/PDF → imagem)
- [ ] Nenhum dado de paciente real (regime não-SaMD, LGPD) — casos sintéticos/de-identificados
