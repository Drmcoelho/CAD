"""cad_engine.py — porte fiel de ``core/cad_core.js`` para Python.

Fase 0 da validação retrospectiva do CAD 360. Este módulo NÃO é fonte de
doutrina: a POLICY é carregada em runtime de ``canon/policy.json`` (fonte única
aprovada pelo dono em 2026-08-08 — ver ``VALIDATION/findings.md`` F-001), e o
comportamento é validado bit a bit contra o motor JS pelo gate de paridade
(``pyengine/tests/test_parity.py``).

Mapeamentos JS→Python não-óbvios (decisões de tradução, não de doutrina):

- ``undefined``/``null`` JS → ``None``. O core JS trata os dois como "ausente"
  (``isProvided``, ``== null``), então um único ``None`` preserva a semântica.
- ``NaN`` permanece ``float('nan')`` — o contrato do core (fixado em
  ``cad_core.contract.test.js``) distingue NaN ("campo em branco") de tipo
  errado (``TypeError``), e essa distinção é preservada aqui.
- ``TypeError`` JS → ``TypeError`` Python; ``RangeError`` JS → ``ValueError``
  Python (exceção nativa mais próxima), com mensagens idênticas às do JS.
- ``Math.round`` JS arredonda empate para +∞ (não é o banker's rounding do
  ``round()`` nativo do Python) — implementado em ``_js_math_round`` conforme a
  spec ECMAScript, porque ``round()`` do core JS depende disso.
- Interpolação numérica em template literals JS imprime double inteiro sem
  ``.0`` (``${5.0}`` → ``"5"``); ``_js_num`` reproduz isso para que as strings
  de ``reason`` saiam byte a byte iguais.
- ``!!x`` JS → ``bool(x)`` (mesma tabela-verdade para os tipos que o core
  aceita); ``x ?? y`` JS → ``y if x is None else x`` (nullish, não falsy).
- Booleanos Python são subclasse de ``int``; ``_required_number`` os rejeita
  explicitamente porque ``typeof true !== "number"`` no JS.

Sem rede, sem relógio, sem aleatoriedade, sem dependências fora da stdlib.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from types import MappingProxyType
from typing import Any, Mapping, Optional, Union

Number = Union[int, float]

_REPO_ROOT = Path(__file__).resolve().parent.parent
_POLICY_PATH = _REPO_ROOT / "canon" / "policy.json"

# Number.EPSILON do JS == DBL_EPSILON == sys.float_info.epsilon (2^-52)
_EPSILON = sys.float_info.epsilon


def _freeze(value: Any) -> Any:
    """Espelha o Object.freeze recursivo implícito da POLICY do core JS."""
    if isinstance(value, dict):
        return MappingProxyType({k: _freeze(v) for k, v in value.items()})
    if isinstance(value, list):
        return tuple(_freeze(v) for v in value)
    return value


def _load_policy() -> Mapping[str, Any]:
    with open(_POLICY_PATH, "r", encoding="utf-8") as fh:
        return _freeze(json.load(fh))


#: Fonte única em runtime: canon/policy.json. O gate de paridade confirma que
#: todo valor usado pelo motor JS (POLICY inline congelada) existe aqui com o
#: mesmo valor — divergência quebra o gate antes de qualquer uso clínico.
POLICY: Mapping[str, Any] = _load_policy()


def _required_number(name: str, value: Any) -> Number:
    """JS ``requiredNumber``: número finito ou TypeError com a mesma mensagem."""
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise TypeError(f"{name} must be a finite number")
    return value


def _is_provided(value: Any) -> bool:
    """JS ``isProvided`` (undefined/null → ausente); NaN conta como fornecido."""
    return value is not None


def _is_nan(value: Any) -> bool:
    """``Number.isNaN`` do JS: só o NaN de verdade, nunca coerção de tipo."""
    return isinstance(value, float) and math.isnan(value)


def _is_missing(value: Any) -> bool:
    """JS ``input[k] == null || Number.isNaN(input[k])`` do classifyDkaProfile."""
    return value is None or _is_nan(value)


def _js_math_round(x: float) -> float:
    """``Math.round`` da spec ECMAScript: mais próximo, empate para +infinito.

    Não usar ``round()`` do Python (banker's) nem ``floor(x+0.5)`` (perde o
    caso 0.49999999999999994, em que x+0.5 arredonda para 1.0 em double).
    """
    floor = math.floor(x)
    diff = x - floor
    if diff > 0.5:
        return floor + 1
    if diff < 0.5:
        return floor
    return floor + 1


def js_round(value: Number, decimals: int = 2) -> float:
    """JS ``round(value, decimals)`` do core: mesma sequência de operações."""
    factor = 10.0 ** decimals
    return _js_math_round((value + _EPSILON) * factor) / factor


def _js_num(value: Any) -> str:
    """Número → string como um template literal JS (double inteiro sem '.0')."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value):
            return "NaN"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        if value.is_integer() and abs(value) < 1e21:
            return str(int(value))
        return repr(value)  # shortest round-trip, igual ao double-to-string do JS
    return str(value)


def anion_gap(na: Any, cl: Any, hco3: Any) -> Number:
    return _required_number("na", na) - (_required_number("cl", cl) + _required_number("hco3", hco3))


def corrected_anion_gap(ag: Any, albumin: Any = 4.0) -> Number:
    return _required_number("ag", ag) + 2.5 * (4.0 - _required_number("albumin", albumin))


def delta_ratio(agc: Any, hco3: Any) -> Number:
    denominator = 24 - _required_number("hco3", hco3)
    if denominator == 0:
        # JS: RangeError → ValueError (exceção Python equivalente), mesma mensagem
        raise ValueError("deltaRatio denominator is zero when HCO3 equals 24")
    return (_required_number("agc", agc) - 12) / denominator


def interpret_delta_ratio(value: Any) -> dict:
    ratio = _required_number("deltaRatio", value)
    if ratio < 1:
        return {
            "band": "<1",
            "label": "AGMA + cauda hipercloremica/NAGMA",
            "decision": "nao chamar de pura; procurar cloro/perda de HCO3 e tendencia temporal",
        }
    if ratio <= 2:
        return {
            "band": "1-2",
            "label": "AGMA de gap alto mais limpa",
            "decision": "padrao esperado de cetoacidose sem mistura metabolica dominante",
        }
    return {
        "band": ">2",
        "label": "alcalose metabolica associada ou HCO3 previo alto",
        "decision": "procurar vomitos, diuretico, contracao ou bicarbonato previo",
    }


def winter(hco3: Any) -> dict:
    expected = 1.5 * _required_number("hco3", hco3) + 8
    return {"expected": expected, "low": expected - 2, "high": expected + 2}


def sodium_correction_factor(glucose_mg_dl: Any) -> Number:
    glucose = _required_number("glucoseMgDl", glucose_mg_dl)
    sc = POLICY["sodiumCorrection"]
    return (
        sc["factorSevereHyperglycemia"]
        if glucose > sc["severeHyperglycemiaAboveMgDl"]
        else sc["factorDefault"]
    )


def corrected_sodium(na: Any, glucose_mg_dl: Any, factor: Any = None) -> Number:
    # No JS o parâmetro default avalia sodiumCorrectionFactor(glucoseMgDl) antes
    # do corpo — logo, com factor omitido, a glicose é validada primeiro.
    if factor is None:
        factor = sodium_correction_factor(glucose_mg_dl)
    return _required_number("na", na) + _required_number("factor", factor) * (
        (_required_number("glucoseMgDl", glucose_mg_dl) - 100) / 100
    )


def effective_osmolality(na: Any, glucose_mg_dl: Any) -> Number:
    return 2 * _required_number("na", na) + _required_number("glucoseMgDl", glucose_mg_dl) / 18


def total_calculated_osmolality(params: Mapping[str, Any]) -> Number:
    """JS recebe um objeto ``{na, glucoseMgDl, bunMgDl?, ureaMgDl?}``; BUN tem
    precedência sobre ureia quando ambos vierem (mesma ordem de guardas)."""
    effective = effective_osmolality(params.get("na"), params.get("glucoseMgDl"))
    bun = params.get("bunMgDl")
    if bun is not None:
        return effective + _required_number("bunMgDl", bun) / 2.8
    urea = params.get("ureaMgDl")
    if urea is not None:
        return effective + _required_number("ureaMgDl", urea) / 6
    return effective


def potassium_plan(k_mmol_l: Any) -> dict:
    k = _required_number("kMmolL", k_mmol_l)
    pot = POLICY["potassium"]
    if k < pot["holdInsulinBelowMmolL"]:
        return {
            "band": "<3.5",
            "insulin": "hold",
            "potassium": "replace before insulin; monitor closely",
            "target": "4-5 mmol/L",
        }
    if k < pot["replaceBelowMmolL"]:
        return {
            "band": "3.5-5.0",
            "insulin": "allowed",
            "potassium": "replace to maintain 4-5 mmol/L",
            "target": "4-5 mmol/L",
        }
    return {
        "band": ">=5.0",
        "insulin": "allowed",
        "potassium": "no initial potassium; ECG/recheck",
        "target": "4-5 mmol/L",
    }


def insulin_plan(params: Mapping[str, Any]) -> dict:
    k_plan = potassium_plan(params.get("kMmolL"))
    if k_plan["insulin"] == "hold":
        # JS valida a glicose só depois deste retorno (curto-circuito preservado)
        return {
            "rateUnitsKgHour": 0,
            "action": "hold insulin until K >= 3.5",
            "dextrose": False,
            "potassium": k_plan,
        }
    glucose = _required_number("glucoseMgDl", params.get("glucoseMgDl"))
    ins = POLICY["insulin"]
    dextrose = glucose < ins["reduceGlucoseBelowMgDl"]
    return {
        "rateUnitsKgHour": ins["reducedUnitsKgHour"] if dextrose else ins["initialUnitsKgHour"],
        "action": "continue insulin with dextrose" if dextrose else "start fixed-rate insulin",
        "dextrose": dextrose,
        "potassium": k_plan,
    }


def has_dka(params: Mapping[str, Any]) -> bool:
    known_diabetes = params.get("knownDiabetes", False)
    glucose = params.get("glucoseMgDl")
    bhb = params.get("betaHydroxybutyrateMmolL")
    cruzes = params.get("ketonuriaCruzes")
    ph = params.get("ph")
    hco3 = params.get("hco3")

    # JS: knownDiabetes || requiredNumber(...) — glicose só é validada se preciso
    glucose_axis = bool(known_diabetes) or _required_number("glucoseMgDl", glucose) >= POLICY["diagnosis"]["glucoseMgDl"]

    if not _is_provided(bhb) and not _is_provided(cruzes):
        raise TypeError("hasDka requires at least one of betaHydroxybutyrateMmolL or ketonuriaCruzes")
    ketone_axis = False
    if _is_provided(bhb):
        ketone_axis = ketone_axis or _required_number("betaHydroxybutyrateMmolL", bhb) >= POLICY["diagnosis"]["betaHydroxybutyrateMmolL"]
    if _is_provided(cruzes):
        ketone_axis = ketone_axis or _required_number("ketonuriaCruzes", cruzes) >= POLICY["diagnosis"]["ketonuriaCruzesAtLeast"]

    if not _is_provided(ph) and not _is_provided(hco3):
        raise TypeError("hasDka requires at least one of ph or hco3")
    acid_axis = False
    if _is_provided(ph):
        acid_axis = acid_axis or _required_number("ph", ph) < POLICY["diagnosis"]["ph"]
    if _is_provided(hco3):
        acid_axis = acid_axis or _required_number("hco3", hco3) < POLICY["diagnosis"]["bicarbonateMmolL"]

    return bool(glucose_axis and ketone_axis and acid_axis)


def is_resolved_dka(params: Mapping[str, Any]) -> bool:
    ketone_resolved = (
        _required_number("betaHydroxybutyrateMmolL", params.get("betaHydroxybutyrateMmolL"))
        < POLICY["resolution"]["betaHydroxybutyrateBelowMmolL"]
    )
    ph = params.get("ph")
    hco3 = params.get("hco3")
    if not _is_provided(ph) and not _is_provided(hco3):
        raise TypeError("isResolvedDka requires at least one of ph or hco3")
    acid_resolved = False
    if _is_provided(ph):
        acid_resolved = acid_resolved or _required_number("ph", ph) >= POLICY["resolution"]["phAtLeast"]
    if _is_provided(hco3):
        acid_resolved = acid_resolved or _required_number("hco3", hco3) >= POLICY["resolution"]["bicarbonateAtLeastMmolL"]
    return bool(ketone_resolved and acid_resolved)


def classify_dka_profile(input: Mapping[str, Any]) -> dict:  # noqa: A002 — nome espelha o JS
    """Porte de ``classifyDkaProfile`` — mesma cadeia de regras, mesma ordem de
    ``matches``, mesmas strings de ``reason`` (byte a byte, via ``_js_num``)."""
    req = ["na", "cl", "hco3", "glucoseMgDl", "ph"]
    missing = [k for k in req if _is_missing(input.get(k))]
    has_bhb = not _is_missing(input.get("betaHydroxybutyrateMmolL"))
    has_cruzes = not _is_missing(input.get("ketonuriaCruzes"))
    if not has_bhb and not has_cruzes:
        missing.append("betaHydroxybutyrateMmolL|ketonuriaCruzes")
    if missing:
        return {"insufficient": True, "missing": missing}

    na = input.get("na")
    cl = input.get("cl")
    hco3 = input.get("hco3")
    glu = input.get("glucoseMgDl")
    ph = input.get("ph")
    bhb = input.get("betaHydroxybutyrateMmolL") if has_bhb else None
    cruzes = input.get("ketonuriaCruzes") if has_cruzes else None
    albumin_in = input.get("albumin")
    albumin = 4.0 if albumin_in is None else albumin_in  # JS ?? — nullish, NaN passa
    known_diabetes = bool(input.get("knownDiabetes"))
    lactate = input.get("lactateMmolL")
    suspected_sepsis = bool(input.get("suspectedSepsis"))
    dialysis_dependent = bool(input.get("dialysisDependent"))

    P = POLICY
    ag = anion_gap(na, cl, hco3)
    agc = corrected_anion_gap(ag, albumin)
    dd = delta_ratio(agc, hco3) if hco3 != 24 else None
    dd_band = interpret_delta_ratio(dd) if dd is not None else None
    osm_eff = effective_osmolality(na, glu)
    dka = has_dka(
        {
            "knownDiabetes": known_diabetes,
            "glucoseMgDl": glu,
            "betaHydroxybutyrateMmolL": bhb,
            "ketonuriaCruzes": cruzes,
            "ph": ph,
            "hco3": hco3,
        }
    )
    resolved: Optional[bool] = (
        is_resolved_dka({"betaHydroxybutyrateMmolL": bhb, "ph": ph, "hco3": hco3}) if has_bhb else None
    )
    k_in = input.get("kMmolL")
    k_plan = potassium_plan(k_in) if (k_in is not None and not _is_nan(k_in)) else None
    ketone_axis = (bhb is not None and bhb >= P["diagnosis"]["betaHydroxybutyrateMmolL"]) or (
        cruzes is not None and cruzes >= P["diagnosis"]["ketonuriaCruzesAtLeast"]
    )
    acid_axis = ph < P["diagnosis"]["ph"] or hco3 < P["diagnosis"]["bicarbonateMmolL"]
    ketone_note = f"βHB {_js_num(bhb)}" if has_bhb else f"cetonúria {_js_num(cruzes)}+"

    matches: list = []

    def add(id_: Optional[str], reason: str) -> None:
        matches.append({"id": id_, "reason": reason})

    if not known_diabetes and glu < P["diagnosis"]["glucoseMgDl"] and ketone_axis:
        add(
            "alcoolica-jejum",
            f"cetose real ({ketone_note}), mas o eixo glicêmico do critério formal não fecha (não-diabético + glicose <200) — não é CAD diabética.",
        )
    elif not dka and ketone_axis and not acid_axis:
        add(
            "pre-cad",
            f"{ketone_note} já cruza o limiar cetônico, mas pH e HCO₃ ainda dentro do critério — fase pré-acidose (tampão ainda segura).",
        )
    elif not dka and not ketone_axis and acid_axis:
        if resolved is True:
            add(
                "hipercloremica",
                "cetose já abaixo do limiar e resolução formal atingida (pH ou HCO₃ na meta), mas HCO₃ ainda baixo — provável cauda hiperclorêmica, não CAD ativa.",
            )
        elif resolved is False:
            add(
                "parcial",
                "cetose abaixo do limiar diagnóstico mas resolução ainda não atingida — zona de trânsito (nem CAD nova, nem resolvida).",
            )
        else:
            add(
                "parcial",
                "cetose (cruzes) abaixo do limiar diagnóstico, com acidose residual — pode ser cetose ainda em resolução. Sem β-HB sérico, cetonúria isolada não confirma qual das duas hipóteses é a certa (acetoacetato pode subir durante o próprio tratamento, mesmo com a cetose resolvendo).",
            )
            add(
                "hipercloremica",
                "cetose (cruzes) abaixo do limiar diagnóstico, com acidose residual — pode ser cauda hiperclorêmica já instalada em vez de cetose ainda ativa. Sem β-HB sérico, cetonúria isolada não confirma qual das duas hipóteses é a certa.",
            )
    elif dka:
        if dialysis_dependent:
            add(
                "dialitica",
                "DRC dialítica — sem clearance renal, a glicose não tem via de escape (diurese osmótica) e o K carece de via de excreção; volume/K/ácido-base seguem lógica distinta da CAD com função renal preservada.",
            )
            if osm_eff > 300:
                matches.append(
                    {
                        "id": None,
                        "reason": f"osm efetiva {_js_num(js_round(osm_eff, 1))} > 300 — território hiperosmolar acentuado pela ausência de clearance renal de glicose, não necessariamente sobreposição do fenótipo CAD+HHS.",
                    }
                )
        else:
            if glu < P["insulin"]["reduceGlucoseBelowMgDl"]:
                add(
                    "euglicemica",
                    f"glicose {_js_num(glu)} < {_js_num(P['insulin']['reduceGlucoseBelowMgDl'])} apesar de o critério de CAD já estar fechado — fenótipo euglicêmico (SGLT2i/jejum/gestação/etilismo).",
                )
            if glu >= 500 or osm_eff > 300:
                osm_part = f" e osm efetiva {_js_num(js_round(osm_eff, 1))} > 300" if osm_eff > 300 else ""
                add("cad-hhs", f"glicose muito alta{osm_part} — considerar sobreposição com HHS.")
        if (lactate is not None and not _is_nan(lactate) and lactate >= 4) or suspected_sepsis:
            add("sepse-lactato", "lactato elevado e/ou contexto séptico — acidose provavelmente mista (cetona + lactato).")
        if not matches:
            add("classica", "critério de CAD fechado, sem sinal específico de outro fenótipo — apresentação clássica.")

    if dd_band is not None and dd_band["band"] == "<1" and not any(m["id"] == "hipercloremica" for m in matches):
        matches.append(
            {
                "id": None,
                "reason": f"Δ/Δ {_js_num(js_round(dd, 2))} <1 — componente hiperclorêmico associado, independente do perfil principal.",
            }
        )

    if k_plan is not None and k_plan["insulin"] == "hold":
        matches.append(
            {
                "id": None,
                "reason": f"K {_js_num(k_in)} <3,5 — adiar a insulina e repor potássio primeiro, independente do perfil principal.",
            }
        )
    elif k_plan is not None and k_plan["band"] == ">=5.0":
        matches.append(
            {
                "id": None,
                "reason": f"K {_js_num(k_in)} ≥5,0 — insulina liberada sem reposição inicial de potássio; reavaliar com ECG, independente do perfil principal.",
            }
        )

    return {
        "insufficient": False,
        "computed": {
            "ag": js_round(ag, 1),
            "agc": js_round(agc, 1),
            "deltaRatio": js_round(dd, 2) if dd is not None else None,
            "deltaBand": dd_band["band"] if dd_band is not None else None,
            "effectiveOsmolality": js_round(osm_eff, 1),
            "hasDka": dka,
            "isResolvedDka": resolved,
            "ketoneMarker": "betaHB" if has_bhb else "cetonuriaCruzes",
            "potassiumPlan": k_plan,
        },
        "matches": matches,
    }


#: Mapa nome-JS → função Python, espelhando CAD_CORE_EXPORTS do core. Usado
#: pelo gate de paridade e pelo runner para despachar pelo nome canônico.
EXPORTS = {
    "round": js_round,
    "anionGap": anion_gap,
    "correctedAnionGap": corrected_anion_gap,
    "deltaRatio": delta_ratio,
    "interpretDeltaRatio": interpret_delta_ratio,
    "winter": winter,
    "sodiumCorrectionFactor": sodium_correction_factor,
    "correctedSodium": corrected_sodium,
    "effectiveOsmolality": effective_osmolality,
    "totalCalculatedOsmolality": total_calculated_osmolality,
    "potassiumPlan": potassium_plan,
    "insulinPlan": insulin_plan,
    "hasDka": has_dka,
    "isResolvedDka": is_resolved_dka,
    "classifyDkaProfile": classify_dka_profile,
}
