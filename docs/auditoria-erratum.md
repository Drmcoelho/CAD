# Errata — sincronização `docs/auditoria` ⇄ canon/app

`CAD360-ApA-2026-07-01` · errata datada **2026-07-02** · **atualizada 2026-07-05** (binários regenerados — ver rodapé)

Os artefatos `docs/auditoria.docx` e `docs/auditoria.pdf` são **saídas renderizadas**
(a auditoria da Fase 1, congelada no momento em que foi escrita). Como todo o resto
do repo, obedecem à fonte única (`core/cad_core.js` + `canon/policy.json`). Cinco
pontos do corpo da auditoria ficaram atrás do canon depois dos hotfixes clínicos —
os 3 originais (01–03) mais 2 achados de uma auditoria própria em 2026-07-05 (04–05,
que a errata original **não pegou**). Todos os cinco já estão corrigidos nos binários
(ver rodapé); esta errata fica como **registro datado da reconciliação**, não mais
como correção pendente.

## 1. Δ/Δ = 0,93 não é "quase pura" — ✅ aplicado

**No doc (worked case, Q "Δ/Δ 0,93"):** "Δ/Δ = (26 − 12)/(24 − 9) = 14/15 = 0,93 → AGMA quase pura."

**Canon:** as fronteiras do Δ/Δ são **1** e **2** (`core.interpretDeltaRatio`). `0,93 < 1`
cai na banda `<1` — **AGMA limítrofe, já com cauda hiperclorêmica/NAGMA**, não "pura".
Chamar de "quase pura" é o erro que a própria Fase 1 (adjudicação A1) corrigiu no `app/`
e nas pranchas (EX01). O worked case deve ler:

> 0,93 → AGMA **limítrofe** (Δ/Δ < 1: já há componente hiperclorêmico; não chamar de pura sem olhar Cl⁻/tendência).

## 2. Bicarbonato — o consenso escreve pH < 7,0; a fronteira de evidência é ≤ 6,9 — ✅ aplicado

**No doc:** "Bicarbonato é exceção extrema (pH < 7,0), não reflexo." e, na tabela de doutrina, "somente pH < 7,0".

**Canon:** `core.POLICY.bicarbonate.considerBelowPh = 7.0` é o número que o **consenso 2024
escreve**. O `app/` e `canon/policy.json` acrescentam a **fronteira de evidência**: sem
benefício demonstrado acima de **6,9**; abaixo de 6,9 não há RCT — é decisão de terapia
intensiva conforme gravidade/protocolo local/risco. As duas menções do doc devem carregar
essa ressalva:

> exceção extrema — consenso escreve **pH < 7,0**; **fronteira de evidência: sem benefício acima de 6,9**, e abaixo disso é decisão de UTI, não rotina.

## 3. Compensação — o doc trata Winter; o app cobre os quatro distúrbios

**No doc:** a compensação aparece pela lente do **Winter** (acidose metabólica: pCO₂ esperada
= 1,5·HCO₃ + 8), inclusive o exercício B-4 que usa o Winter para flagrar acidose respiratória
concomitante.

**Canon/app:** a aba **Fisiologia** do `app/` calcula a compensação esperada dos **quatro
distúrbios primários** (as seis fórmulas, com agudo/crônico no eixo respiratório):

| Distúrbio | Esperado |
|---|---|
| Acidose metabólica | pCO₂ = 1,5·HCO₃ + 8 (± 2) |
| Alcalose metabólica | pCO₂ = 0,7·HCO₃ + 21 (± 2) |
| Acidose respiratória aguda | HCO₃ = 24 + 0,1·(pCO₂ − 40) |
| Acidose respiratória crônica | HCO₃ = 24 + 0,35·(pCO₂ − 40) |
| Alcalose respiratória aguda | HCO₃ = 24 − 0,2·(40 − pCO₂) |
| Alcalose respiratória crônica | HCO₃ = 24 − 0,4·(40 − pCO₂) |

O Winter (linha 1) é o subconjunto que o doc já cobre; o app é a referência para os demais.
Isto é acréscimo de cobertura, não correção de erro.

## 4. Exercício B-6 (osmolaridade efetiva) dupla-contava a glicose — ✅ aplicado

**Achado em 2026-07-05**, numa auditoria própria do repo pós-PR#15 — a errata original
(pontos 1–3) não pegou este. É o **mesmo furo já corrigido no EX04 do lote2** (ver
`ROADMAP.md` §1), só que sobrevivendo intacto aqui: o exercício B-5 pede Na corrigido
(130 → 142, correto). O exercício B-6 encadeava direto no **142** como se fosse o valor
de entrada da osm efetiva — "Na 142, glicose 600. Calcule e interprete." — e o gabarito
computava `2·142 + 600/18 = 317`, dupla-contando a glicose (o Na corrigido já embute uma
correção pela glicose; usá-lo de novo na fórmula de osm conta o mesmo efeito duas vezes).

**Canon:** osm efetiva = **2·Na MEDIDO + glicose/18** (`core.effectiveOsmolality`) — nunca
com o Na corrigido. Com Na medido 130: `2·130 + 600/18 = 293,3`, que **não** cruza o
limiar HHS (>320) — o Na corrigido 142 sinaliza o déficit de água livre emergente, mas é
um eixo separado. Aplicado:

> B-6 (premissa): "Na medido 130 (Na corrigido 142, do exercício anterior), glicose 600. Calcule a osm efetiva e interprete."
> B-6 (gabarito): "Osm efetiva = 2·130 (Na MEDIDO) + 600/18 = 260 + 33,3 = 293,3 — ainda não cruza o limiar HHS (>320). O Na corrigido (142) revela o déficit de água livre emergente, mas não entra na fórmula de osm efetiva — usá-lo dupla-conta a glicose."

## 5. Apêndice A — "adiar insulina até > 3,5" reabria a zona cinzenta do K — ✅ aplicado

**Achado em 2026-07-05**, mesma auditoria. A Fase 1 padronizou os operadores de K para
`≥` especificamente para eliminar a zona cinzenta em K = 3,5 (reiniciar insulina em
`K ≥ 3,5`, não `K > 3,5` nem `K > 3,3`). A tabela de doutrina do Apêndice A (linha
"Potássio") ainda usava `> 3,5`, o que deixaria K = 3,5 exato numa zona
sem instrução. Corrigido para:

> "repor quando < 5,0 (manter 4–5). K < 3,5 → repor 10 mmol/h e ADIAR insulina até **≥ 3,5**."

---

### Estado dos binários

**Os cinco pontos acima estão aplicados nos dois binários**, `docs/auditoria.docx` (fonte
editável, corrigida string a string) e `docs/auditoria.pdf` (regenerado a partir do `.docx`
corrigido). Onde este errata e os binários coincidirem, é porque a reconciliação foi
concluída — o errata fica como **registro datado**, não como pendência.

**Nota sobre o pipeline de regeneração do PDF (2026-07-05):** o ambiente onde esta correção
foi feita tem `soffice`/LibreOffice **instalado, mas com a conversão headless quebrada**
(`soffice --headless --convert-to pdf` falha até para um `.txt` trivial — não é problema
deste arquivo). O caminho nativo continua sendo o correto quando houver um ambiente
funcional:

```bash
soffice --headless --convert-to pdf --outdir docs docs/auditoria.docx
```

Na ausência disso, o `docs/auditoria.pdf` atual foi gerado por um **fallback**: `pandoc`
(`.docx` → HTML) + Chromium headless (HTML → PDF via `page.pdf()`), com uma folha de
estilo mínima para paginação/tabelas/tipografia razoáveis. O conteúdo e os números batem
com o `.docx` (conferido via extração de texto do PDF); a **diagramação não é idêntica**
à exportação nativa do Word/LibreOffice (sem cabeçalho/rodapé original, quebras de página
diferentes). Quando um ambiente com LibreOffice funcional estiver disponível, regenerar
pelo comando acima é o passo correto para recuperar a fidelidade visual original — não
há mudança de conteúdo a fazer, só de motor de renderização.
