# Errata — sincronização `docs/auditoria` ⇄ canon/app

`CAD360-ApA-2026-07-01` · errata datada **2026-07-02**

Os artefatos `docs/auditoria.docx` e `docs/auditoria.pdf` são **saídas renderizadas**
(a auditoria da Fase 1, congelada no momento em que foi escrita). Como todo o resto
do repo, obedecem à fonte única (`core/cad_core.js` + `canon/policy.json`). Três
pontos do corpo da auditoria ficaram atrás do canon depois dos hotfixes clínicos; esta
errata é a correção autoritativa até os binários serem regenerados. Onde o `.docx`/`.pdf`
divergir do que segue abaixo, **vale o que está aqui** (e o que está no `app/` e no core).

## 1. Δ/Δ = 0,93 não é "quase pura"

**No doc (worked case, Q "Δ/Δ 0,93"):** "Δ/Δ = (26 − 12)/(24 − 9) = 14/15 = 0,93 → AGMA quase pura."

**Canon:** as fronteiras do Δ/Δ são **1** e **2** (`core.interpretDeltaRatio`). `0,93 < 1`
cai na banda `<1` — **AGMA limítrofe, já com cauda hiperclorêmica/NAGMA**, não "pura".
Chamar de "quase pura" é o erro que a própria Fase 1 (adjudicação A1) corrigiu no `app/`
e nas pranchas (EX01). O worked case deve ler:

> 0,93 → AGMA **limítrofe** (Δ/Δ < 1: já há componente hiperclorêmico; não chamar de pura sem olhar Cl⁻/tendência).

## 2. Bicarbonato — o consenso escreve pH < 7,0; a fronteira de evidência é ≤ 6,9

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

---

### Estado dos binários

Os pontos 1 e 2 já estão aplicados na **fonte editável** do `.docx` (três strings, um run
cada). A regeneração do `docs/auditoria.pdf` a partir do `.docx` exige um ambiente com
LibreOffice/`soffice` headless funcional (indisponível na sessão que escreveu esta errata),
então os binários seguem inalterados para **não** criar divergência `.docx` ⇄ `.pdf`. Ao
regenerar:

```bash
soffice --headless --convert-to pdf --outdir docs docs/auditoria.docx
```

Depois de regenerados e conferidos no render, esta errata pode ser dobrada de volta ao corpo
da auditoria (ou mantida como registro datado da reconciliação — que é a prática de auditoria).
