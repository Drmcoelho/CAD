"""abg_engine.py — porte fiel de ``core/abg_core.js`` para Python.

Motor geral de gasometria (stepwise Boston/Narins), companheiro do
``cad_engine``. Diferente da doutrina de CAD, a POLICY da gasometria
(``ABG-2026-07-05``) **não tem espelho em** ``canon/policy.json`` — vive apenas
inline no JS (ver ``VALIDATION/findings.md`` F-003). Por isso este módulo
carrega um espelho literal daquela POLICY; o gate de paridade valida o espelho
por deep-equal bidirecional contra a POLICY real exportada pelo motor JS, então
qualquer divergência quebra o gate. Isto é porte, não fonte nova de doutrina.

Reusa ``anion_gap``/``corrected_anion_gap``/``js_round`` de ``cad_engine``
(mesma fórmula, uma fonte — espelhando o require interno do JS).

Mapeamentos JS→Python não-óbvios: os mesmos do ``cad_engine`` (ver docstring
lá), mais: o ``isProvided`` local do abg_core exclui NaN (diferente do
``isProvided`` do cad_core) — preservado em ``_is_provided_abg``.
"""

from __future__ import annotations

from types import MappingProxyType
from typing import Any, Mapping, Optional

from cad_engine import (  # type: ignore[import-not-found]
    _is_nan,
    _js_num,
    _required_number,
    anion_gap,
    corrected_anion_gap,
    js_round,
)

#: Espelho literal da POLICY inline de core/abg_core.js:35-56 (sem fonte JSON
#: no canon — F-003). Validado por deep-equal no gate de paridade.
POLICY: Mapping[str, Any] = MappingProxyType(
    {
        "version": "ABG-2026-07-05",
        "source": (
            "Abordagem stepwise classica (Boston/Narins) para gasometria; formulas de "
            "compensacao consistentes com Winter (cad_core.js) para a acidose metabolica."
        ),
        "normal": MappingProxyType(
            {"phLow": 7.35, "phHigh": 7.45, "pco2Low": 35, "pco2High": 45, "hco3Low": 22, "hco3High": 26}
        ),
        "compensation": MappingProxyType(
            {
                "metabolicAcidosis": MappingProxyType(
                    {"nome": "Acidose metabólica", "eixo": "pco2", "formula": "pCO₂ esp = 1,5·HCO₃ + 8", "tolerance": 2}
                ),
                "metabolicAlkalosis": MappingProxyType(
                    {"nome": "Alcalose metabólica", "eixo": "pco2", "formula": "pCO₂ esp = 0,7·HCO₃ + 21", "tolerance": 2}
                ),
                "respiratoryAcidosisAcute": MappingProxyType(
                    {"nome": "Acidose respiratória aguda", "eixo": "hco3", "formula": "HCO₃ esp = 24 + 0,1·(pCO₂−40)", "tolerance": 2}
                ),
                "respiratoryAcidosisChronic": MappingProxyType(
                    {"nome": "Acidose respiratória crônica", "eixo": "hco3", "formula": "HCO₃ esp = 24 + 0,35·(pCO₂−40)", "tolerance": 3}
                ),
                "respiratoryAlkalosisAcute": MappingProxyType(
                    {"nome": "Alcalose respiratória aguda", "eixo": "hco3", "formula": "HCO₃ esp = 24 − 0,2·(40−pCO₂)", "tolerance": 2}
                ),
                "respiratoryAlkalosisChronic": MappingProxyType(
                    {"nome": "Alcalose respiratória crônica", "eixo": "hco3", "formula": "HCO₃ esp = 24 − 0,4·(40−pCO₂)", "tolerance": 3}
                ),
            }
        ),
    }
)


def _is_provided_abg(value: Any) -> bool:
    """``isProvided`` local do abg_core: ``value != null && !Number.isNaN(value)``."""
    return value is not None and not _is_nan(value)


def _round1(value: Any, decimals: int = 1) -> float:
    """``round`` local do abg_core: delega ao round do cad com default 1."""
    return js_round(value, decimals)


def _expected_range(expected: float, tolerance: float) -> dict:
    return {
        "expected": _round1(expected),
        "low": _round1(expected - tolerance),
        "high": _round1(expected + tolerance),
    }


def expected_pco2_metabolic_acidosis(hco3: Any) -> dict:
    return _expected_range(1.5 * hco3 + 8, POLICY["compensation"]["metabolicAcidosis"]["tolerance"])


def expected_pco2_metabolic_alkalosis(hco3: Any) -> dict:
    return _expected_range(0.7 * hco3 + 21, POLICY["compensation"]["metabolicAlkalosis"]["tolerance"])


def expected_hco3_resp_acidosis_acute(pco2: Any) -> dict:
    return _expected_range(24 + 0.1 * (pco2 - 40), POLICY["compensation"]["respiratoryAcidosisAcute"]["tolerance"])


def expected_hco3_resp_acidosis_chronic(pco2: Any) -> dict:
    return _expected_range(24 + 0.35 * (pco2 - 40), POLICY["compensation"]["respiratoryAcidosisChronic"]["tolerance"])


def expected_hco3_resp_alkalosis_acute(pco2: Any) -> dict:
    return _expected_range(24 - 0.2 * (40 - pco2), POLICY["compensation"]["respiratoryAlkalosisAcute"]["tolerance"])


def expected_hco3_resp_alkalosis_chronic(pco2: Any) -> dict:
    return _expected_range(24 - 0.4 * (40 - pco2), POLICY["compensation"]["respiratoryAlkalosisChronic"]["tolerance"])


def classify_primary_disturbance(input: Optional[Mapping[str, Any]]) -> dict:  # noqa: A002
    """Porte de ``classifyPrimaryDisturbance`` — mesma cadeia de branches,
    mesmas strings (byte a byte), mesmo shape de retorno."""
    if input is None:
        # JS: `if (!input)` — cobre undefined/null, os dois casos do contrato testado
        raise TypeError("input must be an object")
    ph = _required_number("ph", input.get("ph"))
    pco2 = _required_number("pco2", input.get("pco2"))
    hco3 = _required_number("hco3", input.get("hco3"))
    N = POLICY["normal"]

    acidemia = ph < N["phLow"]
    alkalemia = ph > N["phHigh"]
    ph_normal = not acidemia and not alkalemia

    met_acid = hco3 < N["hco3Low"]
    met_alk = hco3 > N["hco3High"]
    resp_acid = pco2 > N["pco2High"]
    resp_alk = pco2 < N["pco2Low"]

    primary: list = []
    notes: list = []
    compensation_check: Optional[dict] = None
    hint = input.get("chronicityHint")

    def hint_label() -> str:
        return "agudo" if hint == "acute" else "crônico"

    if met_acid and resp_acid:
        primary.append(
            {
                "type": "metabolicAcidosis",
                "reason": f"HCO₃ {_js_num(hco3)} baixo E pCO₂ {_js_num(pco2)} alto ao mesmo tempo — nunca é compensação (compensação move a outra variável na direção oposta); são dois processos acidificantes independentes.",
            }
        )
        primary.append(
            {
                "type": "respiratoryAcidosis",
                "reason": "mesmo raciocínio do item acima — acidose respiratória combinada, não compensação de uma pela outra.",
            }
        )
    elif met_alk and resp_alk:
        primary.append(
            {
                "type": "metabolicAlkalosis",
                "reason": f"HCO₃ {_js_num(hco3)} alto E pCO₂ {_js_num(pco2)} baixo ao mesmo tempo — dois processos alcalinizantes independentes, não compensação.",
            }
        )
        primary.append(
            {"type": "respiratoryAlkalosis", "reason": "mesmo raciocínio do item acima — alcalose respiratória combinada."}
        )
    elif met_acid and resp_alk:
        if alkalemia:
            acute = expected_hco3_resp_alkalosis_acute(pco2)
            chronic = expected_hco3_resp_alkalosis_chronic(pco2)
            primary.append(
                {
                    "type": "respiratoryAlkalosis",
                    "reason": f"pH {_js_num(ph)} alcalêmico com pCO₂ {_js_num(pco2)} < {_js_num(N['pco2Low'])} — componente respiratório alcalinizante primário; HCO₃ {_js_num(hco3)} baixo é a resposta renal compensatória na direção oposta, não um segundo processo acidificante.",
                }
            )
            if hint in ("acute", "chronic"):
                exp = acute if hint == "acute" else chronic
                verdict = "excessivo" if hco3 < exp["low"] else ("insuficiente" if hco3 > exp["high"] else "adequado")
                compensation_check = {
                    "for": f"respiratoryAlkalosis{'Acute' if hint == 'acute' else 'Chronic'}",
                    "measured": hco3,
                    **exp,
                    "verdict": verdict,
                }
                if verdict == "insuficiente":
                    primary.append(
                        {
                            "type": "metabolicAlkalosis",
                            "reason": f"HCO₃ {_js_num(hco3)} > {_js_num(exp['high'])} (esperado para {hint_label()}) — componente metabólico alcalinizante adicional.",
                        }
                    )
                if verdict == "excessivo":
                    primary.append(
                        {
                            "type": "metabolicAcidosis",
                            "reason": f"HCO₃ {_js_num(hco3)} < {_js_num(exp['low'])} — componente metabólico acidificante adicional (a compensação renal deveria reduzir o HCO₃ até esse piso, não além).",
                        }
                    )
            else:
                notes.append(
                    f"agudeza não informada — janelas esperadas de HCO₃: agudo {_js_num(acute['low'])}–{_js_num(acute['high'])}, crônico {_js_num(chronic['low'])}–{_js_num(chronic['high'])}. HCO₃ medido {_js_num(hco3)}."
                )
                compensation_check = {"for": "respiratoryAlkalosis", "measured": hco3, "acute": acute, "chronic": chronic}
        elif acidemia:
            exp = expected_pco2_metabolic_acidosis(hco3)
            verdict = "excessivo" if pco2 < exp["low"] else ("insuficiente" if pco2 > exp["high"] else "adequado")
            primary.append(
                {
                    "type": "metabolicAcidosis",
                    "reason": f"pH {_js_num(ph)} acidêmico com HCO₃ {_js_num(hco3)} < {_js_num(N['hco3Low'])} — componente metabólico acidificante primário; pCO₂ {_js_num(pco2)} baixo é a resposta respiratória compensatória (Winter).",
                }
            )
            compensation_check = {"for": "metabolicAcidosis", "measured": pco2, **exp, "verdict": verdict}
            if verdict == "insuficiente":
                primary.append(
                    {
                        "type": "respiratoryAcidosis",
                        "reason": f"pCO₂ {_js_num(pco2)} > {_js_num(exp['high'])} (limite superior esperado) — o pulmão não baixou o CO₂ o quanto deveria; componente respiratório acidificante adicional.",
                    }
                )
            elif verdict == "excessivo":
                primary.append(
                    {
                        "type": "respiratoryAlkalosis",
                        "reason": f"pCO₂ {_js_num(pco2)} < {_js_num(exp['low'])} (limite inferior esperado) — hiperventilação além da compensação prevista; componente respiratório alcalinizante adicional.",
                    }
                )
        else:
            exp_met = expected_pco2_metabolic_acidosis(hco3)
            exp_resp_chronic = expected_hco3_resp_alkalosis_chronic(pco2)
            notes.append(
                f"pH {_js_num(ph)} normal com HCO₃ {_js_num(hco3)} baixo E pCO₂ {_js_num(pco2)} baixo simultaneamente — ambíguo a partir só dos números: compatível com (a) acidose metabólica com compensação respiratória completa (pCO₂ esperado {_js_num(exp_met['low'])}–{_js_num(exp_met['high'])}) OU (b) alcalose respiratória crônica com compensação renal completa (HCO₃ esperado {_js_num(exp_resp_chronic['low'])}–{_js_num(exp_resp_chronic['high'])}). Contexto clínico decide qual é o primário, não o número isolado."
            )
            primary.append(
                {
                    "type": "metabolicAcidosis",
                    "reason": "leitura possível 1: componente metabólico acidificante primário, compensação respiratória completa.",
                }
            )
            primary.append(
                {
                    "type": "respiratoryAlkalosis",
                    "reason": "leitura possível 2: componente respiratório alcalinizante primário, compensação renal completa.",
                }
            )
    elif met_alk and resp_acid:
        if acidemia:
            acute = expected_hco3_resp_acidosis_acute(pco2)
            chronic = expected_hco3_resp_acidosis_chronic(pco2)
            primary.append(
                {
                    "type": "respiratoryAcidosis",
                    "reason": f"pH {_js_num(ph)} acidêmico com pCO₂ {_js_num(pco2)} > {_js_num(N['pco2High'])} — componente respiratório acidificante primário; HCO₃ {_js_num(hco3)} alto é a resposta renal compensatória na direção oposta, não um segundo processo alcalinizante.",
                }
            )
            if hint in ("acute", "chronic"):
                exp = acute if hint == "acute" else chronic
                verdict = "excessivo" if hco3 > exp["high"] else ("insuficiente" if hco3 < exp["low"] else "adequado")
                compensation_check = {
                    "for": f"respiratoryAcidosis{'Acute' if hint == 'acute' else 'Chronic'}",
                    "measured": hco3,
                    **exp,
                    "verdict": verdict,
                }
                if verdict == "insuficiente":
                    primary.append(
                        {
                            "type": "metabolicAcidosis",
                            "reason": f"HCO₃ {_js_num(hco3)} < {_js_num(exp['low'])} (esperado para {hint_label()}) — componente metabólico acidificante adicional.",
                        }
                    )
                if verdict == "excessivo":
                    primary.append(
                        {
                            "type": "metabolicAlkalosis",
                            "reason": f"HCO₃ {_js_num(hco3)} > {_js_num(exp['high'])} — componente metabólico alcalinizante adicional.",
                        }
                    )
            else:
                notes.append(
                    f"agudeza não informada — janelas esperadas de HCO₃: agudo {_js_num(acute['low'])}–{_js_num(acute['high'])}, crônico {_js_num(chronic['low'])}–{_js_num(chronic['high'])}. HCO₃ medido {_js_num(hco3)}."
                )
                compensation_check = {"for": "respiratoryAcidosis", "measured": hco3, "acute": acute, "chronic": chronic}
        elif alkalemia:
            exp = expected_pco2_metabolic_alkalosis(hco3)
            verdict = "excessivo" if pco2 > exp["high"] else ("insuficiente" if pco2 < exp["low"] else "adequado")
            primary.append(
                {
                    "type": "metabolicAlkalosis",
                    "reason": f"pH {_js_num(ph)} alcalêmico com HCO₃ {_js_num(hco3)} > {_js_num(N['hco3High'])} — componente metabólico alcalinizante primário; pCO₂ {_js_num(pco2)} alto é a resposta respiratória compensatória.",
                }
            )
            compensation_check = {"for": "metabolicAlkalosis", "measured": pco2, **exp, "verdict": verdict}
            if verdict == "insuficiente":
                primary.append(
                    {
                        "type": "respiratoryAlkalosis",
                        "reason": f"pCO₂ {_js_num(pco2)} < {_js_num(exp['low'])} — o pulmão não reteve CO₂ o quanto deveria; componente respiratório alcalinizante adicional.",
                    }
                )
            elif verdict == "excessivo":
                primary.append(
                    {
                        "type": "respiratoryAcidosis",
                        "reason": f"pCO₂ {_js_num(pco2)} > {_js_num(exp['high'])} — retenção de CO₂ além da compensação prevista; componente respiratório acidificante adicional.",
                    }
                )
        else:
            exp_met = expected_pco2_metabolic_alkalosis(hco3)
            exp_resp_chronic = expected_hco3_resp_acidosis_chronic(pco2)
            notes.append(
                f"pH {_js_num(ph)} normal com HCO₃ {_js_num(hco3)} alto E pCO₂ {_js_num(pco2)} alto simultaneamente — ambíguo a partir só dos números: compatível com (a) alcalose metabólica com compensação respiratória completa (pCO₂ esperado {_js_num(exp_met['low'])}–{_js_num(exp_met['high'])}) OU (b) acidose respiratória crônica com compensação renal completa (HCO₃ esperado {_js_num(exp_resp_chronic['low'])}–{_js_num(exp_resp_chronic['high'])}). Contexto clínico decide qual é o primário, não o número isolado."
            )
            primary.append(
                {
                    "type": "metabolicAlkalosis",
                    "reason": "leitura possível 1: componente metabólico alcalinizante primário, compensação respiratória completa.",
                }
            )
            primary.append(
                {
                    "type": "respiratoryAcidosis",
                    "reason": "leitura possível 2: componente respiratório acidificante primário, compensação renal completa.",
                }
            )
    elif met_acid:
        exp = expected_pco2_metabolic_acidosis(hco3)
        verdict = "excessivo" if pco2 < exp["low"] else ("insuficiente" if pco2 > exp["high"] else "adequado")
        primary.append(
            {"type": "metabolicAcidosis", "reason": f"HCO₃ {_js_num(hco3)} < {_js_num(N['hco3Low'])} fecha o componente metabólico acidificante."}
        )
        compensation_check = {"for": "metabolicAcidosis", "measured": pco2, **exp, "verdict": verdict}
        if verdict == "insuficiente":
            primary.append(
                {
                    "type": "respiratoryAcidosis",
                    "reason": f"pCO₂ {_js_num(pco2)} > {_js_num(exp['high'])} (limite superior esperado) — o pulmão não baixou o CO₂ o quanto deveria; componente respiratório acidificante adicional (mesmo que pCO₂ pareça \"normal\" isoladamente).",
                }
            )
        elif verdict == "excessivo":
            primary.append(
                {
                    "type": "respiratoryAlkalosis",
                    "reason": f"pCO₂ {_js_num(pco2)} < {_js_num(exp['low'])} (limite inferior esperado) — hiperventilação além da compensação prevista; componente respiratório alcalinizante adicional, pode estar mascarando o pH.",
                }
            )
    elif met_alk:
        exp = expected_pco2_metabolic_alkalosis(hco3)
        verdict = "excessivo" if pco2 > exp["high"] else ("insuficiente" if pco2 < exp["low"] else "adequado")
        primary.append(
            {"type": "metabolicAlkalosis", "reason": f"HCO₃ {_js_num(hco3)} > {_js_num(N['hco3High'])} fecha o componente metabólico alcalinizante."}
        )
        compensation_check = {"for": "metabolicAlkalosis", "measured": pco2, **exp, "verdict": verdict}
        if verdict == "insuficiente":
            primary.append(
                {
                    "type": "respiratoryAlkalosis",
                    "reason": f"pCO₂ {_js_num(pco2)} < {_js_num(exp['low'])} — o pulmão não reteve CO₂ o quanto deveria; componente respiratório alcalinizante adicional.",
                }
            )
        elif verdict == "excessivo":
            primary.append(
                {
                    "type": "respiratoryAcidosis",
                    "reason": f"pCO₂ {_js_num(pco2)} > {_js_num(exp['high'])} — retenção de CO₂ além da compensação prevista; componente respiratório acidificante adicional.",
                }
            )
    elif resp_acid:
        acute = expected_hco3_resp_acidosis_acute(pco2)
        chronic = expected_hco3_resp_acidosis_chronic(pco2)
        primary.append(
            {"type": "respiratoryAcidosis", "reason": f"pCO₂ {_js_num(pco2)} > {_js_num(N['pco2High'])} fecha o componente respiratório acidificante."}
        )
        if hint in ("acute", "chronic"):
            exp = acute if hint == "acute" else chronic
            verdict = "excessivo" if hco3 > exp["high"] else ("insuficiente" if hco3 < exp["low"] else "adequado")
            compensation_check = {
                "for": f"respiratoryAcidosis{'Acute' if hint == 'acute' else 'Chronic'}",
                "measured": hco3,
                **exp,
                "verdict": verdict,
            }
            if verdict == "insuficiente":
                primary.append(
                    {
                        "type": "metabolicAcidosis",
                        "reason": f"HCO₃ {_js_num(hco3)} < {_js_num(exp['low'])} (esperado para {hint_label()}) — componente metabólico acidificante adicional (a compensação renal deveria elevar o HCO₃, nunca reduzi-lo).",
                    }
                )
            if verdict == "excessivo":
                primary.append(
                    {
                        "type": "metabolicAlkalosis",
                        "reason": f"HCO₃ {_js_num(hco3)} > {_js_num(exp['high'])} — componente metabólico alcalinizante adicional.",
                    }
                )
        else:
            notes.append(
                f"agudeza não informada — janelas esperadas de HCO₃ calculadas para os dois cenários: agudo {_js_num(acute['low'])}–{_js_num(acute['high'])}, crônico {_js_num(chronic['low'])}–{_js_num(chronic['high'])}. HCO₃ medido {_js_num(hco3)}. Sem contexto clínico (tempo de instalação), não adivinhar qual se aplica."
            )
            compensation_check = {"for": "respiratoryAcidosis", "measured": hco3, "acute": acute, "chronic": chronic}
    elif resp_alk:
        acute = expected_hco3_resp_alkalosis_acute(pco2)
        chronic = expected_hco3_resp_alkalosis_chronic(pco2)
        primary.append(
            {"type": "respiratoryAlkalosis", "reason": f"pCO₂ {_js_num(pco2)} < {_js_num(N['pco2Low'])} fecha o componente respiratório alcalinizante."}
        )
        if hint in ("acute", "chronic"):
            exp = acute if hint == "acute" else chronic
            verdict = "excessivo" if hco3 < exp["low"] else ("insuficiente" if hco3 > exp["high"] else "adequado")
            compensation_check = {
                "for": f"respiratoryAlkalosis{'Acute' if hint == 'acute' else 'Chronic'}",
                "measured": hco3,
                **exp,
                "verdict": verdict,
            }
            if verdict == "insuficiente":
                primary.append(
                    {
                        "type": "metabolicAlkalosis",
                        "reason": f"HCO₃ {_js_num(hco3)} > {_js_num(exp['high'])} (esperado para {hint_label()}) — componente metabólico alcalinizante adicional.",
                    }
                )
            if verdict == "excessivo":
                primary.append(
                    {
                        "type": "metabolicAcidosis",
                        "reason": f"HCO₃ {_js_num(hco3)} < {_js_num(exp['low'])} — componente metabólico acidificante adicional (a compensação renal deveria reduzir o HCO₃ até esse piso, não além).",
                    }
                )
        else:
            notes.append(
                f"agudeza não informada — janelas esperadas de HCO₃: agudo {_js_num(acute['low'])}–{_js_num(acute['high'])}, crônico {_js_num(chronic['low'])}–{_js_num(chronic['high'])}. HCO₃ medido {_js_num(hco3)}."
            )
            compensation_check = {"for": "respiratoryAlkalosis", "measured": hco3, "acute": acute, "chronic": chronic}
    else:
        if not ph_normal:
            notes.append(
                f"pH {_js_num(ph)} fora da faixa normal mas HCO₃ e pCO₂ isolados estão dentro da referência — verificar erro pré-analítico/laboratorial ou disturbio misto com componentes que se cancelam perto dos limites de referência."
            )
        else:
            notes.append(
                "HCO₃, pCO₂ e pH dentro da faixa normal por este eixo — isto NÃO exclui um gap elevado mascarado por uma alcalose concomitante; sempre calcular o AG de forma independente."
            )

    if ph_normal and primary:
        notes.append(
            f"pH {_js_num(ph)} está dentro da faixa de referência apesar do(s) componente(s) identificado(s) — clássico de disturbio misto com cancelamento parcial; pH normal não significa ausência de doença."
        )

    ag = None
    agc = None
    if _is_provided_abg(input.get("na")) and _is_provided_abg(input.get("cl")):
        ag = _round1(anion_gap(input.get("na"), input.get("cl"), hco3))
        albumin_in = input.get("albumin")
        agc = _round1(corrected_anion_gap(ag, 4.0 if albumin_in is None else albumin_in))
        if agc > 12 and not met_acid:
            notes.append(
                f"AGc {_js_num(agc)} elevado apesar de HCO₃ {_js_num(hco3)} não estar baixo — gap alto mascarado (provável alcalose ou disturbio misto escondendo a acidose de gap alto; nunca dispense o cálculo do AG só porque o HCO₃ \"fechou normal\")."
            )
    lactate = input.get("lactateMmolL")
    if _is_provided_abg(lactate) and lactate >= 2:
        notes.append(
            f"lactato {_js_num(lactate)} mmol/L elevado — considerar componente lático no gap, hipoperfusão/sepse, ou artefato de torniquete/exercício antes de assumir cetoacidose isolada."
        )

    return {
        "ph": ph,
        "pco2": pco2,
        "hco3": hco3,
        "acidemia": acidemia,
        "alkalemia": alkalemia,
        "phNormal": ph_normal,
        "components": {
            "metabolicAcidosis": met_acid,
            "metabolicAlkalosis": met_alk,
            "respiratoryAcidosis": resp_acid,
            "respiratoryAlkalosis": resp_alk,
        },
        "primary": primary,
        "compensationCheck": compensation_check,
        "ag": ag,
        "agc": agc,
        "notes": notes,
    }


#: Mapa nome-JS → função Python, espelhando ABG_CORE_EXPORTS.
EXPORTS = {
    "round": _round1,
    "expectedPco2MetabolicAcidosis": expected_pco2_metabolic_acidosis,
    "expectedPco2MetabolicAlkalosis": expected_pco2_metabolic_alkalosis,
    "expectedHco3RespAcidosisAcute": expected_hco3_resp_acidosis_acute,
    "expectedHco3RespAcidosisChronic": expected_hco3_resp_acidosis_chronic,
    "expectedHco3RespAlkalosisAcute": expected_hco3_resp_alkalosis_acute,
    "expectedHco3RespAlkalosisChronic": expected_hco3_resp_alkalosis_chronic,
    "classifyPrimaryDisturbance": classify_primary_disturbance,
}
