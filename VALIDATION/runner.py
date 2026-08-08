"""runner.py — Fase 0 · Etapa 4: executa o motor Python sobre casos YAML e
emite a tabela de concordância/divergência + logs auditáveis.

O runner é deliberadamente burro no que importa: ele NÃO julga clínica.
Marca automaticamente apenas o que é mecânico —

  * ``motor_travou_por_dado_ausente`` — o motor recusou algum ponto temporal
    (``insufficient: true``) por falta de insumo essencial;
  * ``motor_degradou`` — o motor executou, mas com incerteza declarada por
    dado ausente (sem βHB sérico → resolução indeterminada; albumina ausente →
    default 4,0; sem K → sem plano de potássio; sem pCO₂ → braço de gasometria
    não executado);
  * caso contrário a linha nasce ``PENDENTE_ADJUDICACAO`` e o julgamento
    concordante/divergente é do dono, no campo ``adjudicacao`` do YAML.

Dois braços por caso:
  * ``acuracia`` — labs exatamente como extraídos do relato;
  * ``executabilidade_UPA`` — mesmos pontos re-executados mascarando (→ null)
    todo campo com ``disponibilidade: ausente_no_cenario_UPA``, quantificando o
    custo decisório do laboratório incompleto de UPA.

Determinismo: sem rede, sem relógio, sem aleatoriedade; stdlib + PyYAML; a
mesma árvore de arquivos produz byte a byte as mesmas saídas (logs incluem
SHA-256 do substrato e dos motores). Casos sintéticos (``synthetic: true`` +
sufixo ``_SYNTHETIC``) são estampados em toda saída.

Uso:
    python3 VALIDATION/runner.py                # roda cases/ + cases_synthetic/
    python3 VALIDATION/runner.py --only-synthetic
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

VALIDATION_DIR = Path(__file__).resolve().parent
REPO_ROOT = VALIDATION_DIR.parent
sys.path.insert(0, str(REPO_ROOT / "pyengine"))

import abg_engine  # noqa: E402
import cad_engine  # noqa: E402

CASES_DIR = VALIDATION_DIR / "cases"
SYNTH_DIR = VALIDATION_DIR / "cases_synthetic"
RESULTS_DIR = VALIDATION_DIR / "results"
LOGS_DIR = RESULTS_DIR / "logs"

#: Campos de labs que alimentam o motor (denominador do % de dados disponíveis)
LAB_FIELDS = [
    "glucoseMgDl", "na", "cl", "hco3", "k", "ph", "pco2",
    "betaHydroxybutyrateMmolL", "ketonuriaCruzes", "albumin",
    "lactateMmolL", "bunMgDl", "ureaMgDl",
]

ARMS = ("acuracia", "executabilidade_UPA")


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def substrate_fingerprint() -> Dict[str, str]:
    return {
        "canon/policy.json": _sha256(REPO_ROOT / "canon" / "policy.json"),
        "core/cad_core.js": _sha256(REPO_ROOT / "core" / "cad_core.js"),
        "pyengine/cad_engine.py": _sha256(REPO_ROOT / "pyengine" / "cad_engine.py"),
        "pyengine/abg_engine.py": _sha256(REPO_ROOT / "pyengine" / "abg_engine.py"),
    }


def load_cases(only_synthetic: bool = False) -> List[Dict[str, Any]]:
    cases: List[Dict[str, Any]] = []
    dirs = [SYNTH_DIR] if only_synthetic else [CASES_DIR, SYNTH_DIR]
    for d in dirs:
        if not d.is_dir():
            continue
        for path in sorted(d.glob("*.yaml")):
            with open(path, "r", encoding="utf-8") as fh:
                case = yaml.safe_load(fh)
            case["_path"] = str(path.relative_to(REPO_ROOT))
            _validate_case(case, path)
            cases.append(case)
    return cases


def _validate_case(case: Dict[str, Any], path: Path) -> None:
    """Valida o contrato do schema que é mecânico (não-clínico)."""
    meta = case.get("meta") or {}
    cid = meta.get("id")
    if not cid:
        raise ValueError(f"{path}: meta.id ausente")
    synthetic = bool(meta.get("synthetic"))
    in_synth_dir = path.parent.name == "cases_synthetic"
    if synthetic != in_synth_dir or synthetic != cid.endswith("_SYNTHETIC"):
        raise ValueError(
            f"{path}: contrato de caso sintético violado — synthetic:{synthetic}, "
            f"diretório {'sintético' if in_synth_dir else 'real'}, id {cid!r} "
            "(exigido: os três coerentes — flag, diretório cases_synthetic/ e sufixo _SYNTHETIC)"
        )
    if not case.get("pontos"):
        raise ValueError(f"{path}: nenhum ponto temporal")
    for p in case["pontos"]:
        disp = p.get("disponibilidade") or {}
        for field, status in disp.items():
            if status not in ("disponivel", "ausente_no_relato", "ausente_no_cenario_UPA"):
                raise ValueError(f"{path}: disponibilidade[{field}]={status!r} inválida")
            value = (p.get("labs") or {}).get(field)
            if status == "ausente_no_relato" and value is not None:
                raise ValueError(f"{path}: t={p.get('t')} {field} marcado ausente_no_relato mas tem valor")
            if status == "ausente_no_cenario_UPA" and value is None:
                raise ValueError(f"{path}: t={p.get('t')} {field} marcado ausente_no_cenario_UPA mas é null no relato")


def masked_labs(ponto: Dict[str, Any], arm: str) -> (Dict[str, Any], List[str]):
    labs = dict(ponto.get("labs") or {})
    masked: List[str] = []
    if arm == "executabilidade_UPA":
        for field, status in (ponto.get("disponibilidade") or {}).items():
            if status == "ausente_no_cenario_UPA" and labs.get(field) is not None:
                labs[field] = None
                masked.append(field)
    return labs, sorted(masked)


def run_point(ponto: Dict[str, Any], arm: str) -> Dict[str, Any]:
    labs, masked = masked_labs(ponto, arm)
    ctx = ponto.get("contexto_clinico") or {}
    cad_input: Dict[str, Any] = {
        "na": labs.get("na"),
        "cl": labs.get("cl"),
        "hco3": labs.get("hco3"),
        "glucoseMgDl": labs.get("glucoseMgDl"),
        "ph": labs.get("ph"),
        "betaHydroxybutyrateMmolL": labs.get("betaHydroxybutyrateMmolL"),
        "ketonuriaCruzes": labs.get("ketonuriaCruzes"),
        "kMmolL": labs.get("k"),
        "lactateMmolL": labs.get("lactateMmolL"),
    }
    if labs.get("albumin") is not None:
        cad_input["albumin"] = labs["albumin"]
    # null no contexto = relato não informa; o motor trata ausência como falso
    # (mesma semântica do JS), e o log registra o que veio null
    for flag in ("knownDiabetes", "suspectedSepsis", "dialysisDependent"):
        if ctx.get(flag) is not None:
            cad_input[flag] = ctx[flag]

    resultado_cad = cad_engine.classify_dka_profile(cad_input)

    resultado_insulina = None
    if labs.get("k") is not None and labs.get("glucoseMgDl") is not None:
        resultado_insulina = cad_engine.insulin_plan({"kMmolL": labs["k"], "glucoseMgDl": labs["glucoseMgDl"]})

    resultado_abg = None
    if labs.get("ph") is not None and labs.get("pco2") is not None and labs.get("hco3") is not None:
        abg_input: Dict[str, Any] = {"ph": labs["ph"], "pco2": labs["pco2"], "hco3": labs["hco3"]}
        for k_src, k_dst in (("na", "na"), ("cl", "cl"), ("albumin", "albumin"), ("lactateMmolL", "lactateMmolL")):
            if labs.get(k_src) is not None:
                abg_input[k_dst] = labs[k_src]
        if ctx.get("chronicityHint") is not None:
            abg_input["chronicityHint"] = ctx["chronicityHint"]
        resultado_abg = abg_engine.classify_primary_disturbance(abg_input)

    flags: List[str] = []
    if resultado_cad.get("insufficient"):
        flags.append("insuficiente:" + ",".join(resultado_cad["missing"]))
    else:
        if resultado_cad["computed"]["ketoneMarker"] == "cetonuriaCruzes":
            flags.append("sem_betaHB_resolucao_indeterminada")
        if labs.get("albumin") is None:
            flags.append("albumin_default_4.0")
    if labs.get("k") is None:
        flags.append("sem_K_sem_plano_potassio")
    if labs.get("pco2") is None:
        flags.append("sem_pCO2_gasometria_nao_executada")

    n_disponiveis = sum(1 for f in LAB_FIELDS if labs.get(f) is not None)
    return {
        "t": ponto.get("t"),
        "braco": arm,
        "campos_mascarados_UPA": masked,
        "input_motor": cad_input,
        "labs_pos_mascara": labs,
        "resultado_cad": resultado_cad,
        "resultado_insulina": resultado_insulina,
        "resultado_abg": resultado_abg,
        "flags_mecanicas": flags,
        "labs_disponiveis": n_disponiveis,
        "labs_total": len(LAB_FIELDS),
    }


def summarize_recommendation(points: List[Dict[str, Any]]) -> str:
    """Resumo MECÂNICO da saída do motor (ids de perfil + plano de K/insulina +
    status de resolução) — não é interpretação, é transcrição compacta."""
    parts: List[str] = []
    p0 = points[0]
    cad0 = p0["resultado_cad"]
    if cad0.get("insufficient"):
        parts.append(f"t0: TRAVOU (faltam: {', '.join(cad0['missing'])})")
    else:
        ids = [m["id"] for m in cad0["matches"] if m["id"]] or ["sem-perfil"]
        parts.append("t0: " + "+".join(ids))
        kp = cad0["computed"]["potassiumPlan"]
        if kp:
            parts.append(f"K {kp['band']}→insulina {kp['insulin']}")
        ins = p0["resultado_insulina"]
        if ins and ins["rateUnitsKgHour"]:
            parts.append(f"{ins['rateUnitsKgHour']} U/kg/h" + ("+dextrose" if ins["dextrose"] else ""))
    last = points[-1]
    cadl = last["resultado_cad"]
    if not cadl.get("insufficient"):
        res = cadl["computed"]["isResolvedDka"]
        res_txt = {True: "resolvida", False: "não resolvida", None: "resolução INDETERMINADA (sem βHB)"}[res]
        parts.append(f"t{last['t']}: {res_txt}")
    else:
        parts.append(f"t{last['t']}: TRAVOU (faltam: {', '.join(cadl['missing'])})")
    return "; ".join(parts)


def summarize_conduct(case: Dict[str, Any]) -> str:
    c = case.get("conduta_relatada") or {}
    parts: List[str] = []
    ins = c.get("insulina") or {}
    if ins.get("adiada_por_potassio"):
        parts.append("insulina adiada por K")
    if ins.get("iniciada"):
        rate = ins.get("taxa_inicial_U_kg_h")
        parts.append("insulina" + (f" {rate} U/kg/h" if rate is not None else ""))
    if ins.get("reduzida_com_dextrose"):
        parts.append("reduzida+dextrose")
    pot = c.get("potassio") or {}
    if pot.get("reposto"):
        parts.append("K reposto" + (" antes da insulina" if pot.get("reposto_antes_da_insulina") else ""))
    bic = c.get("bicarbonato") or {}
    if bic.get("administrado") is True:
        parts.append("bicarbonato SIM")
    elif bic.get("administrado") is False:
        parts.append("sem bicarbonato")
    if c.get("texto_livre"):
        parts.append(c["texto_livre"])
    return "; ".join(parts) if parts else "(não estruturada no relato)"


def summarize_outcome(case: Dict[str, Any]) -> str:
    d = case.get("desfecho") or {}
    parts: List[str] = []
    if d.get("obito"):
        parts.append("ÓBITO")
    if d.get("resolucao") is True:
        t = d.get("tempo_ate_resolucao_h")
        parts.append("resolução" + (f" em {t}h" if t is not None else ""))
    elif d.get("resolucao") is False:
        parts.append("sem resolução")
    comp = d.get("complicacoes")
    if comp:
        parts.append("complicações: " + ", ".join(comp))
    return "; ".join(parts) if parts else "(não relatado)"


def classify_mechanical(points: List[Dict[str, Any]], adjudicacao: str) -> str:
    if any(p["resultado_cad"].get("insufficient") for p in points):
        return "motor_travou_por_dado_ausente"
    if any(p["flags_mecanicas"] for p in points):
        # degradação mecânica declarada; a adjudicação clínica continua sendo do dono
        base = "motor_degradou"
    else:
        base = "executou_completo"
    if adjudicacao and adjudicacao != "PENDENTE":
        return f"{base} · adjudicado: {adjudicacao}"
    return f"{base} · PENDENTE_ADJUDICACAO"


def run_case(case: Dict[str, Any], fingerprint: Dict[str, str]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    meta = case["meta"]
    synthetic = bool(meta.get("synthetic"))
    adjudicacao = ((case.get("adjudicacao") or {}).get("classificacao")) or "PENDENTE"
    for arm in ARMS:
        points = [run_point(p, arm) for p in case["pontos"]]
        disp = sum(p["labs_disponiveis"] for p in points)
        total = sum(p["labs_total"] for p in points)
        pct = 100.0 * disp / total if total else 0.0
        row = {
            "caso": meta["id"] + (" [SYNTHETIC]" if synthetic else ""),
            "braco": arm,
            "dados_disponiveis_pct": f"{pct:.0f}%",
            "recomendacao_motor": summarize_recommendation(points),
            "conduta_relatada": summarize_conduct(case),
            "classificacao": classify_mechanical(points, adjudicacao),
            "desfecho": summarize_outcome(case),
            "observacoes": "; ".join(
                sorted({f for p in points for f in p["campos_mascarados_UPA"]} and
                       [f"mascarados na UPA: {', '.join(sorted({f for p in points for f in p['campos_mascarados_UPA']}))}"])
            ) if arm == "executabilidade_UPA" and any(p["campos_mascarados_UPA"] for p in points) else "",
        }
        rows.append(row)

        log = {
            "AVISO_SINTETICO": "CASO SINTÉTICO — teste de pipeline, sem origem clínica" if synthetic else None,
            "caso": meta["id"],
            "synthetic": synthetic,
            "arquivo_fonte": case["_path"],
            "braco": arm,
            "substrato": fingerprint,
            "policy_version": cad_engine.POLICY["version"],
            "adjudicacao": case.get("adjudicacao"),
            "pontos": points,
            "classificacao_mecanica": row["classificacao"],
        }
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOGS_DIR / f"{meta['id']}__{arm}.json"
        with open(log_path, "w", encoding="utf-8") as fh:
            json.dump(log, fh, ensure_ascii=False, indent=1, default=_jsonable)
            fh.write("\n")
    return rows


def _jsonable(obj: Any) -> Any:
    if hasattr(obj, "keys"):
        return dict(obj)
    raise TypeError(f"não serializável: {type(obj)}")


COLUMNS = [
    "caso", "braco", "dados_disponiveis_pct", "recomendacao_motor",
    "conduta_relatada", "classificacao", "desfecho", "observacoes",
]


def write_tables(rows: List[Dict[str, Any]]) -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(RESULTS_DIR / "table.csv", "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    lines = [
        "# Tabela de validação retrospectiva — Fase 0",
        "",
        "Gerada por `VALIDATION/runner.py` (determinístico; ver `results/logs/` para a",
        "trilha integral por caso). Julgamento concordante/divergente é do dono —",
        "linhas nascem PENDENTE_ADJUDICACAO; o runner só marca o mecânico.",
        f"Substrato: policy `{cad_engine.POLICY['version']}`.",
        "",
        "| " + " | ".join(COLUMNS) + " |",
        "|" + "|".join("---" for _ in COLUMNS) + "|",
    ]
    for r in rows:
        lines.append("| " + " | ".join(str(r[c]) for c in COLUMNS) + " |")
    synth = [r for r in rows if "[SYNTHETIC]" in r["caso"]]
    if synth:
        lines += ["", f"**{len(synth)//len(ARMS)} caso(s) SINTÉTICO(S) de pipeline na tabela — não são dados de validação.**"]
    with open(RESULTS_DIR / "table.md", "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Runner da validação retrospectiva CAD 360 (Fase 0)")
    parser.add_argument("--only-synthetic", action="store_true", help="roda apenas cases_synthetic/")
    args = parser.parse_args()

    cases = load_cases(only_synthetic=args.only_synthetic)
    if not cases:
        print("nenhum caso encontrado em VALIDATION/cases/ ou VALIDATION/cases_synthetic/")
        return 1
    fingerprint = substrate_fingerprint()
    rows: List[Dict[str, Any]] = []
    for case in cases:
        synthetic = bool(case["meta"].get("synthetic"))
        tag = " [SYNTHETIC — teste de pipeline]" if synthetic else ""
        print(f"caso {case['meta']['id']}{tag} ({len(case['pontos'])} ponto(s), braços: {', '.join(ARMS)})")
        rows.extend(run_case(case, fingerprint))
    write_tables(rows)
    n_cases = len(cases)
    n_synth = sum(1 for c in cases if c["meta"].get("synthetic"))
    print(
        f"\n{n_cases} caso(s) ({n_synth} sintético(s)) × {len(ARMS)} braços → "
        f"{len(rows)} linhas em results/table.md + table.csv; logs em results/logs/"
    )
    if n_synth:
        print("AVISO: saída contém caso(s) SINTÉTICO(S) — teste de pipeline, não validação.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
