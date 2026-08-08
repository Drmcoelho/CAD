"""test_parity.py — gate de paridade JS↔Python do CAD 360 (Fase 0, Etapa 2).

Critério de aceite: TODAS as invocações de motor exercitadas pela suíte JS
oficial (155 asserções — contagem real medida, ver VALIDATION/findings.md
F-002) devem reproduzir no motor Python resultado IDÊNTICO — valor a valor,
string a string, exceção a exceção. Encadeamento lógico do gate:

  1. a suíte JS roda intacta sob o harness (`js_trace_harness.js`); qualquer
     asserção vermelha aborta a geração do trace — logo o trace só existe com
     as 155 asserções verdes sobre os resultados JS capturados;
  2. o Python reproduz cada resultado capturado de forma idêntica;
  3. portanto as mesmas 155 asserções valem para o motor Python.

Comparação numérica: igualdade EXATA (mesmo double). Existe uma tolerância de
fallback de 1e-9 (teto do protocolo), mas cada uso é registrado e reportado —
zero usos é o esperado, já que as operações são portadas na mesma ordem IEEE754.

Também valida as POLICYs: cada folha da POLICY do cad_core JS deve existir com
valor idêntico em canon/policy.json (fonte que o motor Python consome), e a
POLICY do abg deve ser deep-equal bidirecional ao espelho Python (F-003).

Uso:
    python3 pyengine/tests/test_parity.py            # regenera o trace via node e replica
    python3 pyengine/tests/test_parity.py --no-regen # usa o trace commitado (exige hashes atuais)

Compatível com pytest (`pytest pyengine/tests/test_parity.py`), mas não o exige.
Sem rede; o único subprocesso é `node` local sobre arquivos do repo.
"""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Any, List, Tuple

TESTS_DIR = Path(__file__).resolve().parent
PYENGINE_DIR = TESTS_DIR.parent
REPO_ROOT = PYENGINE_DIR.parent
TRACE_PATH = TESTS_DIR / "parity_trace.json"
HARNESS_PATH = TESTS_DIR / "js_trace_harness.js"

sys.path.insert(0, str(PYENGINE_DIR))
import abg_engine  # noqa: E402
import cad_engine  # noqa: E402

FLOAT_TOLERANCE = 1e-9  # teto do protocolo; todo uso é reportado nominalmente

# JS → Python: mapeamento de tipos de exceção usado pelos motores portados
ERROR_NAME_MAP = {"TypeError": "TypeError", "RangeError": "ValueError"}

_UNDEFINED = object()  # sentinela para `undefined` JS em posição de argumento


def deserialize(value: Any) -> Any:
    """Reverte as sentinelas do harness (NaN/±Inf/undefined) para valores Python."""
    if isinstance(value, dict):
        if value.get("__nan__") is True:
            return float("nan")
        if "__inf__" in value:
            return math.inf if value["__inf__"] > 0 else -math.inf
        if value.get("__undefined__") is True:
            return _UNDEFINED
        out = {}
        for k, v in value.items():
            d = deserialize(v)
            if d is _UNDEFINED:
                continue  # propriedade com valor undefined ≈ ausente (semântica do core)
            out[k] = d
        return out
    if isinstance(value, list):
        return [deserialize(v) for v in value]
    return value


class ToleranceUse:
    def __init__(self, call_index: int, path: str, js: float, py: float) -> None:
        self.call_index = call_index
        self.path = path
        self.js = js
        self.py = py

    def __str__(self) -> str:
        return f"call #{self.call_index} {self.path}: js={self.js!r} py={self.py!r} (|Δ|={abs(self.js - self.py):.3e})"


def compare(js: Any, py: Any, path: str, call_index: int, tolerance_uses: List[ToleranceUse]) -> List[str]:
    """Compara resultado JS (do trace) com o Python. Retorna lista de divergências."""
    diffs: List[str] = []
    js = deserialize(js) if isinstance(js, (dict, list)) else js

    def walk(a: Any, b: Any, p: str) -> None:
        # bool antes de número: True == 1 em Python, mas JS distingue os tipos
        a_bool, b_bool = isinstance(a, bool), isinstance(b, bool)
        if a_bool or b_bool:
            if a_bool != b_bool or a != b:
                diffs.append(f"{p}: js={a!r} py={b!r}")
            return
        a_num = isinstance(a, (int, float))
        b_num = isinstance(b, (int, float))
        if a_num and b_num:
            if isinstance(a, float) and math.isnan(a):
                if not (isinstance(b, float) and math.isnan(b)):
                    diffs.append(f"{p}: js=NaN py={b!r}")
                return
            if a == b:
                return
            if abs(a - b) <= FLOAT_TOLERANCE:
                tolerance_uses.append(ToleranceUse(call_index, p, a, b))
                return
            diffs.append(f"{p}: js={a!r} py={b!r}")
            return
        if a is None or b is None:
            if a is not b:
                diffs.append(f"{p}: js={a!r} py={b!r}")
            return
        if isinstance(a, str) or isinstance(b, str):
            if a != b:
                diffs.append(f"{p}: js={a!r} py={b!r}")
            return
        if isinstance(a, dict) and isinstance(b, dict):
            if set(a.keys()) != set(b.keys()):
                diffs.append(f"{p}: chaves js={sorted(a.keys())} py={sorted(b.keys())}")
                return
            for k in a:
                walk(a[k], b[k], f"{p}.{k}")
            return
        if isinstance(a, list) and isinstance(b, (list, tuple)):
            if len(a) != len(b):
                diffs.append(f"{p}: tamanhos js={len(a)} py={len(b)}")
                return
            for i, (x, y) in enumerate(zip(a, b)):
                walk(x, y, f"{p}[{i}]")
            return
        diffs.append(f"{p}: tipos incomparáveis js={type(a).__name__} py={type(b).__name__}")

    walk(js, py, path)
    return diffs


def policy_subset_check(js_policy: Any, py_policy: Any, path: str) -> List[str]:
    """Toda folha da POLICY JS deve existir, com valor idêntico, no lado Python."""
    problems: List[str] = []
    if isinstance(js_policy, dict):
        for k, v in js_policy.items():
            if not isinstance(py_policy, (dict,)) and not hasattr(py_policy, "keys"):
                problems.append(f"{path}: lado Python não é objeto")
                return problems
            if k not in py_policy:
                problems.append(f"{path}.{k}: ausente em canon/policy.json")
                continue
            problems.extend(policy_subset_check(v, py_policy[k], f"{path}.{k}"))
        return problems
    if js_policy != py_policy:
        problems.append(f"{path}: js={js_policy!r} py={py_policy!r}")
    return problems


def policy_deep_equal(a: Any, b: Any, path: str) -> List[str]:
    problems = policy_subset_check(a, b, path)
    # direção inversa: nada a mais no lado Python
    if isinstance(a, dict) and hasattr(b, "keys"):
        for k in b.keys():
            if k not in a:
                problems.append(f"{path}.{k}: presente no espelho Python, ausente no JS")
            # descida recursiva já coberta pela direção subset quando a chave existe
    if hasattr(b, "keys") and isinstance(a, dict):
        for k in set(a.keys()) & set(b.keys()):
            if isinstance(a[k], dict):
                problems.extend(policy_deep_equal(a[k], b[k], f"{path}.{k}"))
    return problems


def sha256_of(rel: str) -> str:
    return hashlib.sha256((REPO_ROOT / rel).read_bytes()).hexdigest()


def regenerate_trace() -> None:
    subprocess.run(
        ["node", str(HARNESS_PATH), str(TRACE_PATH)],
        cwd=str(REPO_ROOT),
        check=True,
        capture_output=True,
        text=True,
    )


def run_parity(regen: bool = True) -> Tuple[bool, str]:
    if regen:
        regenerate_trace()
    with open(TRACE_PATH, "r", encoding="utf-8") as fh:
        trace = json.load(fh)

    report_lines: List[str] = []
    failures: List[str] = []
    tolerance_uses: List[ToleranceUse] = []

    # [0] o trace corresponde ao substrato/motor atuais?
    for rel, recorded in trace["substrateHashes"].items():
        current = sha256_of(rel)
        if current != recorded:
            failures.append(f"hash de {rel} mudou desde a geração do trace (regenerar com node)")
    report_lines.append(f"substrato: hashes conferidos ({', '.join(trace['substrateHashes'])})")

    # [1] asserções da suíte JS (o harness aborta se alguma falhar)
    total_asserts = trace["assertions"]["total"]
    per_file = trace["assertions"]["perFile"]
    report_lines.append(
        "suíte JS verde sob o harness: "
        + ", ".join(f"{Path(f).name}={n}" for f, n in per_file.items())
        + f" — total {total_asserts}"
    )

    # [2] POLICY cad: folhas JS ⊆ canon/policy.json (fonte do motor Python)
    cad_policy_problems = policy_subset_check(deserialize(trace["policy"]["cad"]), cad_engine.POLICY, "POLICY.cad")
    failures.extend(cad_policy_problems)
    report_lines.append(
        f"POLICY cad: {'todas as folhas do core JS presentes e idênticas em canon/policy.json' if not cad_policy_problems else f'{len(cad_policy_problems)} divergência(s)'}"
    )

    # [3] POLICY abg: deep-equal bidirecional com o espelho Python (F-003)
    abg_policy_problems = policy_deep_equal(deserialize(trace["policy"]["abg"]), abg_engine.POLICY, "POLICY.abg")
    failures.extend(abg_policy_problems)
    report_lines.append(
        f"POLICY abg: {'deep-equal bidirecional OK' if not abg_policy_problems else f'{len(abg_policy_problems)} divergência(s)'}"
    )

    # [4] replay de todas as chamadas capturadas
    dispatch = {"cad": cad_engine.EXPORTS, "abg": abg_engine.EXPORTS}
    identical = 0
    for i, call in enumerate(trace["calls"]):
        fn = dispatch[call["engine"]].get(call["fn"])
        label = f"call #{i} {call['engine']}.{call['fn']}"
        if fn is None:
            failures.append(f"{label}: função não exportada pelo motor Python")
            continue
        args = [deserialize(a) for a in call["args"]]
        args = [None if a is _UNDEFINED else a for a in args]
        try:
            py_result = fn(*args)
            py_error = None
        except Exception as exc:  # noqa: BLE001 — o contrato inclui exceções esperadas
            py_result = None
            py_error = exc
        if "error" in call:
            expected_type = ERROR_NAME_MAP.get(call["error"]["name"])
            if py_error is None:
                failures.append(f"{label}: JS lançou {call['error']['name']}, Python retornou {py_result!r}")
            elif type(py_error).__name__ != expected_type or str(py_error) != call["error"]["message"]:
                failures.append(
                    f"{label}: exceção divergente — js={call['error']['name']}('{call['error']['message']}') "
                    f"py={type(py_error).__name__}('{py_error}')"
                )
            else:
                identical += 1
        else:
            if py_error is not None:
                failures.append(f"{label}: Python lançou {type(py_error).__name__}('{py_error}'), JS retornou resultado")
                continue
            diffs = compare(call["result"], py_result, label, i, tolerance_uses)
            if diffs:
                failures.extend(diffs[:20])
            else:
                identical += 1

    n_calls = len(trace["calls"])
    report_lines.append(f"replay: {identical}/{n_calls} invocações idênticas")
    if tolerance_uses:
        report_lines.append(f"usos de tolerância 1e-9 ({len(tolerance_uses)}):")
        report_lines.extend(f"  - {t}" for t in tolerance_uses)
    else:
        report_lines.append("usos de tolerância 1e-9: NENHUM (igualdade exata em todos os números)")

    passed = not failures and identical == n_calls
    verdict = (
        f"PARIDADE: {'OK' if passed else 'FALHOU'} — {total_asserts}/{total_asserts} asserções JS verdes; "
        f"{identical}/{n_calls} invocações reproduzidas identicamente em Python"
        if passed
        else f"PARIDADE: FALHOU — {len(failures)} problema(s)"
    )
    body = "\n".join(report_lines + ([""] if failures else []) + failures + ["", verdict])
    return passed, body


def test_parity() -> None:
    """Entry-point pytest: regenera o trace (se node disponível) e replica."""
    passed, body = run_parity(regen=True)
    assert passed, body


def main() -> int:
    regen = "--no-regen" not in sys.argv
    passed, body = run_parity(regen=regen)
    print(body)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
