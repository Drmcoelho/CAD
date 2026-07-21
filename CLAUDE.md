# CLAUDE.md — CAD 360

Manual operacional para qualquer instância que for trabalhar neste repo. Leia antes de editar.
Autor/responsável clínico: **Dr. Matheus M. Coelho · CRM-SP 151.318 · Limeira/SP** (identidade fixa — nunca perguntar).

---

## O que é

Sistema educacional sobre **cetoacidose diabética como sistema dinâmico**. Uso pessoal, **não-SaMD**, humano-no-loop. Offline, single-file, versionado, distribuído livre (padrão do autor: `drmcoelho.github.io`). Fonte de verdade clínica: **consenso 2024 — Umpierrez et al., *Diabetes Care* 2024;47(8):1257–1275.**

## Diretriz-mãe: fonte única

O risco central de material multi-módulo é a **contradição interna** (um módulo dizer `K < 5,5`, o tratado dizer `K < 5,0`). Todo o repo existe para tornar isso impossível de passar:

`core/cad_core.js` (POLICY + funções) e `canon/policy.json` são a **fonte**. App, pranchas, tratado e painel são **saídas renderizadas**. `scripts/check_consistency.js` + CI **quebram o build** se qualquer camada divergir.

**Regra dura:** nenhum número clínico nasce hardcoded em HTML, SVG, parágrafo ou pixel. Mudou uma diretriz? Edita-se `core/cad_core.js` + `canon/policy.json` (um lugar), e o portão recusa qualquer arquivo que ainda carregue o valor velho. Antes de commitar conteúdo novo, rode `npm run ci`.

## Os números canônicos (consenso 2024)

| Eixo | Valor | Nota |
|---|---|---|
| Diagnóstico | glicose ≥200 (ou DM) · βHB ≥3,0 (ou cetonúria ≥2+) · pH <7,30 e/ou HCO₃ <18 | AG **fora** dos critérios formais |
| Potássio | repor se **<5,0**; alvo 4–5; **adiar insulina se <3,5**; reiniciar se **≥3,5** | o antigo **5,5 (JBDS) não é doutrina**; reinício **≥3,5, não 3,3** |
| Bicarbonato | pH-driven; consenso escreve **pH <7,0**; fronteira de evidência **≤6,9** | não é rotina; abaixo de 6,9 é decisão de UTI, sem RCT |
| Insulina | 0,1 → 0,05 U/kg/h quando glicose <250 + dextrose | dextrose = cinto de segurança |
| Na corrigido | fator **1,6** (2,4 se glicose >400) | |
| Osm efetiva | **2·Na MEDIDO + glicose/18** | ureia **fora** (só entra na osm total, p/ osm-gap) |
| Δ/Δ | (AGc−12)/(24−HCO₃); fronteiras em **1 e 2** | <1 cauda hiperclorêmica · 1–2 AGMA limpa · >2 alcalose |
| Resolução | βHB <0,6 **E** (pH ≥7,3 **OU** HCO₃ ≥18) | glicemia normal não é resolução |
| HHS | osm efetiva **>320** (comentário 2024 propõe >300) | 320 é critério; 300 é alerta, status diferente |

Operadores de fronteira usam **`≥`/`<`** consistentes com o core. Nunca `>` onde o core usa `>=`.

## Armadilhas que já nos morderam (não repetir)

- **Na corrigido dentro da osm efetiva** → dupla-conta a glicose. Ex.: EX04, Na 130/glic 600 → efetiva = `2·130+600/18 = 293,3` (medido), **não** `2·142+600/18 = 317,3`. O Na corrigido serve para déficit de água livre, **nunca** para a fórmula de osm. O portão passo [5] enforça isso.
- **`K < 5,5`** (JBDS) reaparecendo por inércia. É `<5,0`. O portão barra a forma de instrução obsoleta (`K < 5,5`, `3,5–5,5`, `K > 3,3`) — mas deixa passar a menção *negada* ("não 3,3"), que é pedagógica.
- **"Δ/Δ 0,93 = quase pura"** → é `<1`, logo **limítrofe**, já com cauda hiperclorêmica. Não chamar de pura sem olhar tendência/Cl.
- **Paciente real em artefato.** Nunca. Só fisiologia/série numérica de-identificada (ver Governança).
- **Caracterizar trabalho pronto como incompleto.** Não presumir; verificar o arquivo/render antes de afirmar estado.

## Comandos

```bash
npm run ci            # test + fixtures + consistência + links (tudo)
npm test              # 292 asserções do core + 12 fixtures clínicas
npm run check         # portão de fonte única + links locais
npm run pranchas:lote1 / :lote2   # regenera SVG a partir do JSON-fonte
```

CI (`.github/workflows/ci.yml`) roda tudo a cada push. **PR com divergência não entra.**

## Layout

`core/` motor+testes+fixtures · `canon/policy.json` doutrina JSON · `app/` núcleo interativo (6 abas) · `tratado/` · `painel/` evolução gasométrica · `pranchas/lote1+2` (svg/png/source.json/geradores) · `scripts/` portão+links · `docs/` auditorias · `ROADMAP.md` plano faseado · `STATUS.md` trilha.

## Como trabalho neste repo (padrões transversais)

**Língua.** Saída em **português**; inglês para código, comandos e identificadores. Raciocínio pode ser em inglês; render em português. Casar com a modalidade da entrada.

**Tom.** Peer-level, direto, sem bajulação nem elogio de abertura. Fisiologia e mecanismo acima de protocolo decorado. Prosa com encadeamento e setas; listas só quando enumeração/comparação **é** a forma do conteúdo (tabelas de referência, sim). Discordar com fundamento vale mais que concordar por inércia.

**Epistemologia.** Distinguir evidência estabelecida · inferência informada · estimativa. Localizar a incerteza em vez de hedge genérico. Comprometer-se quando a evidência permite.

**Entrada por voz.** Espera-se artefato de transcrição; interpretar por intenção, confirmar quando a ambiguidade afeta o resultado. **Clarificação total antes de velocidade** — nunca buildar com entrada de baixa confiança.

**De-identificação (LGPD + não-SaMD).** Nenhum dado de paciente real em qualquer artefato. Casos de ensino são **sintéticos**; se uma série real for usada (ex.: o painel), reduzir a fisiologia/números sem identidade. Isto é regra de segurança, não de estilo.

**Render antes de entregar.** Nunca entregar documento sem olhar o render: HTML → screenshot desktop **e** iPhone; SVG/DOCX/PDF → converter e revisar as páginas em imagem. Locale unificado (2026-07-21): `r()`/`fx()` em `app/` e o `r()` do `painel/`, mais os Tutores de `perfis/`/`tratado/`, renderizam decimal com **vírgula** (pt-BR), casando com as pranchas; entrada tolera vírgula ou ponto (`num()` normaliza), e o deep-link `#calcular?...` segue em ponto (parâmetro de URL, não display). Backlog P2 de locale fechado.

**Código.** Modular, determinístico, auditável, produção-orientado, com logging explícito e degradação graciosa. Stack: Python, JS, Swift, shell (zsh). Apple-first quando aplicável (Shortcuts, Scriptable, terminal). HTML de entrega: **single-file offline** (roda direto no navegador/iOS WebKit) — decisão consciente que sobrepõe "modularizar".

**Pedagogia.** Analogia + mecanismo + profundidade progressiva em camadas (bolso/plantão/consolidação). Socrático: o aluno decide antes de revelar. Calculadora viva (todo output com interpretação clínica). Série temporal (filme, não foto). Uma armadilha nomeada por módulo. Incerteza etiquetada. Distribuição livre por padrão.

**Auditorias.** O autor conduz os próprios ciclos forenses de auditoria-e-build e traz auditorias externas para adjudicar. Adjudicar de fato — separar o que acerta, o que já está feito, o que erra por método e o que passou — em vez de deferir por inércia.

## Governança (regime não-SaMD)

Ferramenta de uso pessoal, humano-no-loop de toda decisão — fora de SaMD (RDC 657/2022, IMDRF). **Tripwire:** compartilhar, ceder a outro clínico ou embarcar em fluxo institucional sobre paciente real reclassifica como SaMD e exige o gate regulatório completo. Antes de qualquer plano que toque decisão clínica automatizada, disparar a triagem SaMD (skill `aprofundamento-projeto-saude`).

## Ao adicionar conteúdo

Número clínico → `canon/policy.json` + `core/`. Cálculo → `core/`. Conteúdo pedagógico → JSON (`pranchas/*/source.json`; alvo Fase 3: `content/*.json`). HTML/SVG/PNG/DOCX/PDF → saídas. Rode `npm run ci` antes de commitar. Próximos passos e fases abertas: `ROADMAP.md`.
