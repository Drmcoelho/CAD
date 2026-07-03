from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARENT = ROOT.parent
sys.path.insert(0, str(PARENT))

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lote1"))
from generate_cad_lote1 import Board, C, mini_axis  # noqa: E402

SRC = ROOT / "source" / "cad_lote2_source.json"
SVG_DIR = ROOT / "svg"
SVG_DIR.mkdir(parents=True, exist_ok=True)
DATA = json.loads(SRC.read_text(encoding="utf-8"))


def save(board: Board, name: str) -> None:
    (SVG_DIR / name).write_text(board.render(), encoding="utf-8")


def module_data(mid: str) -> dict:
    return next(item for item in DATA["modules"] if item["id"] == mid)


def header_board(mid: str, code: str) -> Board:
    m = module_data(mid)
    return Board(f"CAD 360 · {mid}", m["title"], m["subtitle"])


def make_m7() -> None:
    b = header_board("M07", "M07")
    b.card(88, 370, 1144, 580, "A regra que autoriza ou bloqueia", "1", C["amber"])
    rows = [
        ("K < 3,5", "ADIAR insulina", "repor K primeiro", C["red"]),
        ("K 3,5-5,0", "insulina permitida", "K para alvo 4-5", C["amber"]),
        ("K >= 5,0", "sem K inicial", "ECG + recheck", C["green"]),
    ]
    y = 500
    for band, action, note, col in rows:
        b.pill(150, y, 240, 72, band, col, C["bg"], 28)
        b.text(440, y + 48, action, 34, C["white"], 900)
        b.text(805, y + 48, note, 28, C["muted"], 750)
        b.add(f'<line x1="145" y1="{y + 100}" x2="1165" y2="{y + 100}" stroke="{C["line"]}" stroke-width="1.5"/>')
        y += 135
    b.card(88, 1035, 540, 650, "Por que o K mente", "2", C["orange"])
    mini_axis(b, 145, 1165, 390, 250, 2.8, 5.2, [(0, 4.8), (0.3, 4.2), (0.65, 3.4), (1, 3.0)], C["amber"], "K sérico")
    b.lines(145, 1490, "Acidose e falta de insulina deslocam K para fora da celula. Diurese osmotica ja roubou o estoque corporal.", 34, 27, C["ink"], 700)
    b.card(692, 1035, 540, 650, "O que muda a conduta", "3", C["red"])
    for i, txt in enumerate(["insulina joga K para dentro", "volume revela deficit", "hipoK mata antes da cetose", "K alvo: 4-5"]):
        b.pill(755, 1165 + i * 92, 360, 58, txt, [C["purple"], C["blue"], C["red"], C["green"]][i], C["bg"], 23)
    b.card(88, 1765, 1144, 545, "Lei operacional", "4", C["green"])
    b.lines(150, 1900, "Na CAD, potassio nao e detalhe de reposicao: e a permissao para tratar a cetogênese. Se K < 3,5, a insulina certa na doenca errada no tempo vira iatrogenia.", 70, 32, C["ink"], 760)
    b.pill(235, 2205, 850, 74, "Primeiro nao derrubar o paciente; depois fechar a cetose.", C["panel2"], C["white"], 28)
    save(b, "cad-lote2-01-m07-potassio.svg")


def make_m8() -> None:
    b = header_board("M08", "M08")
    b.card(88, 370, 1144, 520, "Bicarbonato não é tratamento da CAD", "1", C["red"])
    b.text(150, 530, "fluido + insulina", 42, C["green"], 900)
    b.text(150, 610, "corrigem a acidose cetótica", 34, C["white"], 850)
    b.lines(150, 715, "Bicarbonato pode mascarar evolução, piorar K e aumentar CO2. A exceção extrema exige contexto crítico e julgamento de UTI.", 58, 30, C["muted"], 600)
    b.card(88, 980, 540, 650, "Quando considerar", "2", C["amber"])
    b.pill(145, 1120, 350, 72, "pH < 7,0", C["amber"], C["bg"], 34)
    b.lines(145, 1265, "Regra didática: considerar, não automatizar. Choque, arritmia, drive respiratório e protocolo local ainda importam.", 34, 28, C["ink"], 700)
    b.card(692, 980, 540, 650, "Quando não resolve", "3", C["orange"])
    b.pill(755, 1120, 360, 64, "pH baixo tardio + Cl alto", C["orange"], C["bg"], 24)
    b.lines(755, 1260, "Se Δ/Δ < 1 e cloro subiu, o problema é cauda hiperclorêmica. O rim e o fluido certo resolvem; bicarbonato não muda a causa.", 32, 27, C["ink"], 700)
    b.card(88, 1730, 1144, 620, "Armadilha", "4", C["purple"])
    b.lines(150, 1870, "Responder à gasometria feia sem perguntar que acidose é essa. Cetose ativa pede insulina; hipercloremia pede tempo, rim, balanceado e menos reflexo.", 58, 32, C["ink"], 760)
    b.pill(250, 2215, 820, 72, "Bicarbonato é ferramenta rara, não botão de pânico.", C["panel2"], C["white"], 28)
    save(b, "cad-lote2-02-m08-bicarbonato.svg")


def make_m9() -> None:
    b = header_board("M09", "M09")
    b.card(88, 370, 1144, 560, "Jejum não significa sem glicose", "1", C["green"])
    b.text(150, 525, "glicose caiu", 40, C["green"], 900)
    b.text(150, 600, "gap/cetona seguem", 40, C["red"], 900)
    b.lines(150, 715, "A resposta não é desligar insulina. É ligar dextrose para permitir que a insulina continue fechando a cetogênese.", 58, 31, C["ink"], 750)
    b.card(88, 1030, 540, 650, "Quando manter jejum", "2", C["amber"])
    for i, txt in enumerate(["vomitos", "risco de aspiracao", "rebaixamento", "procedimento", "instabilidade"]):
        b.pill(145, 1160 + i * 78, 330, 52, txt, C["panel2"], C["ink"], 22)
    b.card(692, 1030, 540, 650, "Transição segura", "3", C["blue"])
    for i, txt in enumerate(["tolerando VO", "cetose resolvida", "basal-bolus prescrito", "sobrepor SC + IV"]):
        b.pill(755, 1160 + i * 90, 360, 58, txt, [C["green"], C["purple"], C["blue"], C["amber"]][i], C["bg"], 23)
    b.card(88, 1765, 1144, 520, "Regra de saída", "4", C["purple"])
    b.lines(150, 1905, "Resolução não é 'glicose bonita'. É β-OHB < 0,6 e pH >= 7,3 ou HCO3 >= 18, com plano de insulina subcutânea e paciente clinicamente seguro.", 56, 32, C["ink"], 760)
    b.pill(230, 2195, 860, 74, "Dextrose na CAD é ferramenta para continuar insulina.", C["green"], C["bg"], 28)
    save(b, "cad-lote2-03-m09-jejum-transicao.svg")


def make_m10() -> None:
    b = header_board("M10", "M10")
    b.card(88, 370, 1144, 660, "As 8 camadas da leitura", "1", C["blue"])
    layers = ["pH", "pCO2/Winter", "HCO3/BE", "lactato", "Na/K/Cl", "AGc", "Δ/Δ", "osm efetiva"]
    for i, layer in enumerate(layers):
        x = 145 + (i % 2) * 520
        y = 510 + (i // 2) * 105
        b.pill(x, y, 350, 62, f"{i+1}. {layer}", C["panel2"], C["ink"], 24)
    b.card(88, 1110, 1144, 720, "Filme: a doença troca de mãos", "2", C["purple"])
    mini_axis(b, 145, 1245, 440, 260, 10, 26, [(0, 24), (0.3, 21), (0.6, 17), (1, 14)], C["green"], "AGc ↓")
    mini_axis(b, 720, 1245, 440, 260, 96, 112, [(0, 99), (0.3, 102), (0.6, 106), (1, 110)], C["orange"], "Cl ↑")
    b.lines(150, 1635, "Quando AGc cai e Cl sobe, o pH que não fecha pode ter deixado de ser cetose e virado cloro.", 70, 30, C["ink"], 740)
    b.card(88, 1905, 1144, 430, "Handoff de uma linha", "3", C["green"])
    b.lines(150, 2045, "Gap caiu, Cl subiu, Δ/Δ < 1: não empilhar insulina para perseguir pH; manter cetose monitorada, K protegido e fluido balanceado.", 72, 32, C["ink"], 780)
    save(b, "cad-lote2-04-m10-gasometria-filme.svg")


def make_m11() -> None:
    b = header_board("M11", "M11")
    b.card(88, 370, 1144, 690, "Velocidades diferentes", "1", C["teal"])
    events = [
        ("glicose", "cai primeiro", C["green"]),
        ("β-OHB/gap", "fecha depois", C["purple"]),
        ("HCO3", "recupera com rim", C["blue"]),
        ("cloro", "some devagar", C["orange"]),
    ]
    for i, (a, d, col) in enumerate(events):
        x = 150 + i * 260
        b.rect(x, 540, 210, 250, "#0d141b", col, 22)
        b.text(x + 105, 625, a, 30, col, 900, "middle")
        b.lines(x + 30, 705, d, 13, 24, C["muted"], 700)
    b.lines(150, 900, "A planilha calcula instantaneamente; o corpo depende de perfusão renal, transporte, tampão, ventilação e substrato.", 72, 30, C["ink"], 730)
    b.card(88, 1145, 540, 660, "Oscilação amortecida", "2", C["blue"])
    mini_axis(b, 145, 1280, 390, 280, 7.05, 7.40, [(0, 7.15), (0.18, 7.30), (0.36, 7.22), (0.62, 7.31), (1, 7.34)], C["blue"], "pH")
    b.lines(145, 1650, "Sobe, cai menos, sobe mais: isso pode ser convergência, não fracasso.", 34, 27, C["ink"], 730)
    b.card(692, 1145, 540, 660, "Urina cetônica engana", "3", C["purple"])
    b.text(755, 1300, "β-OHB → AcAc", 42, C["white"], 900, mono=True)
    b.lines(755, 1405, "Na melhora, β-OHB vira acetoacetato. A fita pode parecer pior enquanto a cetose real melhora.", 32, 28, C["ink"], 730)
    b.card(88, 1885, 1144, 420, "Métrica certa", "4", C["green"])
    b.lines(150, 2020, "Julgue tendência: queda de cetona/gap, K protegido, osm sem queda brusca, cloro reconhecido. Um ponto isolado é pouco; a curva é a resposta.", 72, 32, C["ink"], 760)
    save(b, "cad-lote2-05-m11-compensacao-lenta.svg")


def make_m12() -> None:
    b = header_board("M12", "M12")
    b.card(88, 370, 1144, 780, "Perfis e primeiro movimento", "1", C["green"])
    rows = [
        ("classica", "volume + insulina se K seguro"),
        ("euglicemica", "insulina + dextrose; suspender SGLT2"),
        ("HHS/mista", "osm efetiva + Na corrigido + velocidade"),
        ("hipercloremica tardia", "nao perseguir pH com insulina"),
        ("DRC/idoso/ICC", "volume fracionado + reavaliacao"),
        ("sepse/lactato", "tratar gatilho; nao atribuir tudo a cetose"),
    ]
    y = 510
    for name, move in rows:
        b.text(150, y, name, 28, C["white"], 850)
        b.lines(510, y, move, 40, 26, C["muted"], 650)
        b.add(f'<line x1="145" y1="{y + 34}" x2="1165" y2="{y + 34}" stroke="{C["line"]}" stroke-width="1.4"/>')
        y += 92
    b.card(88, 1240, 540, 650, "Tripwire SaMD", "2", C["red"])
    b.lines(145, 1375, "Uso pessoal: humano-no-loop. Compartilhar, ceder a outro clinico ou embarcar em fluxo institucional reabre gate regulatorio.", 34, 29, C["ink"], 740)
    b.pill(145, 1695, 380, 64, "não é para terceiro", C["red"], C["bg"], 24)
    b.card(692, 1240, 540, 650, "Critério de decisão", "3", C["blue"])
    for i, txt in enumerate(["qual eixo domina?", "qual variável mata primeiro?", "qual número é tendência?", "qual saída evita iatrogenia?"]):
        b.pill(755, 1370 + i * 90, 365, 58, txt, C["panel2"], C["ink"], 22)
    b.card(88, 1970, 1144, 340, "Fecho", "4", C["purple"])
    b.lines(150, 2110, "CAD 360 não ensina protocolo decorado. Ensina a nomear o estado metabólico atual e escolher a próxima intervenção que não atrapalha a fisiologia.", 72, 32, C["ink"], 780)
    save(b, "cad-lote2-06-m12-condutas-perfil.svg")


def make_ex3() -> None:
    ex = next(item for item in DATA["exercises"] if item["id"] == "EX03")
    c = ex["case"]
    b = Board("CAD 360 · EX03", "Exercício: K trava a insulina", "O diagnóstico pode estar certo e a insulina ainda estar proibida.")
    b.card(88, 370, 1144, 500, "Dados", "1", C["blue"])
    vals = [("gli", c["glucose"]), ("pH", c["ph"]), ("HCO3", c["hco3"]), ("β-OHB", c["beta_hydroxybutyrate"]), ("K", c["k"])]
    for i, (k, v) in enumerate(vals):
        x = 145 + i * 210
        b.rect(x, 520, 165, 150, "#0d141b", C["line"], 20)
        b.text(x + 82, 575, k, 23, C["muted"], 850, "middle", mono=True)
        b.text(x + 82, 640, v, 40, C["white"], 950, "middle", mono=True)
    b.card(88, 960, 540, 620, "Leitura", "2", C["purple"])
    b.lines(145, 1100, "β-OHB 6,1 + pH 7,19 + HCO3 8 = CAD. Mas K 3,2 muda a ordem.", 34, 30, C["ink"], 760)
    b.pill(145, 1360, 380, 72, "CAD sim; insulina ainda não", C["red"], C["bg"], 26)
    b.card(692, 960, 540, 620, "Conduta", "3", C["amber"])
    for i, txt in enumerate(["repor K", "monitorizar ECG", "rechecar", "insulina quando K >=3,5"]):
        b.pill(755, 1100 + i * 86, 360, 58, txt, [C["amber"], C["red"], C["blue"], C["green"]][i], C["bg"], 23)
    b.card(88, 1690, 1144, 520, "Resposta", "4", C["green"])
    b.lines(150, 1830, ex["answer"], 72, 32, C["ink"], 780)
    b.pill(235, 2130, 850, 74, "A trava do K vem antes da vontade de fechar o gap.", C["panel2"], C["white"], 28)
    save(b, "cad-lote2-07-ex03-k-trava-insulina.svg")


def make_ex4() -> None:
    ex = next(item for item in DATA["exercises"] if item["id"] == "EX04")
    c = ex["case"]
    b = Board("CAD 360 · EX04", "Exercício: CAD + HHS", "Quando cetose e osmolaridade exigem respeito ao mesmo tempo.")
    b.card(88, 370, 1144, 500, "Dados", "1", C["blue"])
    vals = [("Na", c["na"]), ("gli", c["glucose"]), ("pH", c["ph"]), ("HCO3", c["hco3"]), ("β-OHB", c["beta_hydroxybutyrate"])]
    for i, (k, v) in enumerate(vals):
        x = 145 + i * 210
        b.rect(x, 520, 165, 150, "#0d141b", C["line"], 20)
        b.text(x + 82, 575, k, 23, C["muted"], 850, "middle", mono=True)
        b.text(x + 82, 640, v, 40, C["white"], 950, "middle", mono=True)
    b.card(88, 960, 540, 620, "Cálculo", "2", C["teal"])
    b.text(145, 1100, "NaC = 130 + 2,4x5", 33, C["white"], 900, mono=True)
    b.text(145, 1190, "= 142", 48, C["green"], 950, mono=True)
    b.text(145, 1310, f"Osm efetiva = 2x{c['na']} + 600/18", 27, C["white"], 900, mono=True)
    b.text(145, 1395, f"= {str(c['effective_osm']).replace('.', ',')}", 48, C["amber"], 950, mono=True)
    b.card(692, 960, 540, 620, "Interpretação", "3", C["purple"])
    b.lines(755, 1100, "β-OHB 3,8 e acidose leve fecham eixo CAD. Osm efetiva 293 usa Na MEDIDO e ainda não cruza HHS (>320); o Na corrigido 142 revela o déficit de água livre que emerge ao corrigir a glicose.", 32, 27, C["ink"], 760)
    b.card(88, 1690, 1144, 520, "Resposta", "4", C["green"])
    b.lines(150, 1830, ex["answer"], 72, 32, C["ink"], 780)
    b.pill(235, 2130, 850, 74, "Não trate como CAD simples se a osmolaridade entrou na sala.", C["panel2"], C["white"], 28)
    save(b, "cad-lote2-08-ex04-cad-hhs.svg")


def main() -> None:
    for maker in [make_m7, make_m8, make_m9, make_m10, make_m11, make_m12, make_ex3, make_ex4]:
        maker()
    print(f"Generated {len(list(SVG_DIR.glob('*.svg')))} SVG files in {SVG_DIR}")


if __name__ == "__main__":
    main()
