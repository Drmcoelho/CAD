# CAD 360

[![ci](https://github.com/Drmcoelho/CAD/actions/workflows/ci.yml/badge.svg)](https://github.com/Drmcoelho/CAD/actions/workflows/ci.yml)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](./LICENSE)

Sistema educacional canônico de **cetoacidose diabética como sistema dinâmico**.
Uso pessoal, não-SaMD (autor como humano-no-loop). Offline, single-file, versionado.

**Fonte de verdade clínica:** consenso ADA/EASD/JBDS/AACE/DTS 2024 — Umpierrez et al., *Diabetes Care* 2024;47(8):1257–1275.
Autor: Dr. Matheus M. Coelho · CRM-SP 151.318 · Limeira/SP.

---

## A doutrina: um número, um lugar, versionado

O risco central de um material de ensino multi-módulo é a **contradição interna** — um módulo dizer `K < 5,5` enquanto o tratado diz `K < 5,0`. Este repo existe para tornar isso **impossível de passar despercebido**:

```
core/cad_core.js  →  POLICY (a doutrina em forma de máquina) + funções determinísticas
        ↓ é a fonte de
canon/policy.json →  a mesma doutrina em JSON puro (para as pranchas e para validação)
        ↓ alimenta
app/ · pranchas/ · tratado/ · painel/  →  todas as camadas de saída
        ↓ e
scripts/check_consistency.js  →  QUEBRA o build se qualquer camada divergir
```

Nada renderiza um limiar "na mão". Mudou uma diretriz? Edita-se **um** valor em `core/cad_core.js` (e o espelho em `canon/policy.json`), e o CI recusa qualquer arquivo que ainda carregue o número velho.

## Layout

| Pasta | O que é |
|---|---|
| `core/` | `cad_core.js` — motor determinístico (AG, AGc, Δ/Δ, Winter, Na corrigido, osm efetiva, planos de K e insulina) + `POLICY`. `cad_core.test.js` — 292 asserções. |
| `canon/` | `policy.json` — a doutrina em JSON, incluindo a reconciliação do bicarbonato (7,0 consenso / 6,9 fronteira de evidência). |
| `app/` | `index.html` — o **núcleo interativo** (6 abas: Entender · Fisiologia · Calcular · Provão · Atlas · Referência). Calculadoras vivas, simuladores canvas, motor de questões. |
| `tratado/` | `index.html` — tratado maximalista (bolso/plantão/profundo). |
| `painel/` | `index.html` — painel de evolução gasométrica (série temporal de-identificada). |
| `pranchas/` | `lote1/` (M01–M06 + EX01–EX02) e `lote2/` (M07–M12 + EX03–EX04). Cada lote: `svg/` (vetorial, versionável), `png/`, `source/*.json` (o canon aplicado à imagem), `generate_*.py`. `revisao-m2-m4-m6.png` documenta a correção do K. |
| `docs/` | Auditoria + reescrita + núcleo pedagógico (PDF/DOCX). `auditoria-erratum.md` reconcilia o corpo da auditoria com o canon atual (Δ/Δ, bicarbonato ≤6,9, compensação). |
| `scripts/` | `check_consistency.js` — o portão de fonte única. |

## Rodar

```bash
npm test      # 292 asserções do core
npm run check # o portão de consistência (core ↔ policy ↔ lotes ↔ HTML)
npm run ci    # os dois

# regenerar imagens a partir do JSON-fonte:
npm run pranchas:lote1
npm run pranchas:lote2
```

O CI (`.github/workflows/ci.yml`) roda `test` + `check` a cada push. **PR com divergência não entra.**

## Publicar (GitHub Pages)

`index.html` na raiz é a página de entrada; `app/`, `tratado/`, `painel/` e as pranchas são servidos como estáticos. Todos são single-file offline — funcionam também abrindo o arquivo direto no navegador/iOS.

## Governança (regime não-SaMD)

Ferramenta de **uso pessoal** do autor, humano-no-loop de toda decisão — fora de SaMD (RDC 657/2022, IMDRF). Três condições enquanto durar o regime: (1) validação contra a fonte de verdade; (2) responsabilidade clínica integral do autor; (3) **tripwire** — compartilhar, ceder a outro clínico ou embarcar em fluxo institucional sobre paciente real reclassifica como SaMD e exige o gate regulatório completo. Ver `docs/auditoria` e `STATUS.md`.
