from __future__ import annotations

import json
import math
import textwrap
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "source" / "cad_lote1_source.json"
SVG_DIR = ROOT / "svg"
SVG_DIR.mkdir(parents=True, exist_ok=True)

DATA = json.loads(SRC.read_text(encoding="utf-8"))

W, H = 1320, 2868

C = {
    "bg": "#101820",
    "panel": "#172330",
    "panel2": "#1d2b3a",
    "ink": "#edf5fb",
    "muted": "#aebdcc",
    "dim": "#788b9e",
    "line": "#314557",
    "blue": "#37c6e0",
    "teal": "#46d7b4",
    "green": "#55d88f",
    "amber": "#f2b441",
    "orange": "#ef8f4c",
    "red": "#ff6464",
    "purple": "#b18cf0",
    "white": "#ffffff",
}


def e(value: object) -> str:
    return escape(str(value), {"\"": "&quot;"})


def wrap(text: str, width: int) -> list[str]:
    return textwrap.wrap(str(text), width=width, break_long_words=False, break_on_hyphens=False)


class Board:
    def __init__(self, code: str, title: str, subtitle: str):
        self.code = code
        self.title = title
        self.subtitle = subtitle
        self.parts: list[str] = []

    def add(self, raw: str) -> None:
        self.parts.append(raw)

    def text(
        self,
        x: float,
        y: float,
        text: object,
        size: int = 30,
        color: str = C["ink"],
        weight: int = 600,
        anchor: str = "start",
        mono: bool = False,
        opacity: float = 1,
    ) -> None:
        fam = "JetBrains Mono, SFMono-Regular, Menlo, Consolas, monospace" if mono else "Inter, Avenir Next, Arial, sans-serif"
        self.add(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{fam}" '
            f'font-size="{size}" font-weight="{weight}" fill="{color}" opacity="{opacity}">{e(text)}</text>'
        )

    def lines(
        self,
        x: float,
        y: float,
        text: str,
        width: int,
        size: int = 26,
        color: str = C["muted"],
        weight: int = 500,
        gap: float = 1.28,
    ) -> float:
        yy = y
        for line in wrap(text, width):
            self.text(x, yy, line, size=size, color=color, weight=weight)
            yy += size * gap
        return yy

    def rect(self, x: float, y: float, w: float, h: float, fill: str = C["panel"], stroke: str = C["line"], rx: int = 24, opacity: float = 1) -> None:
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="2" opacity="{opacity}"/>')

    def card(self, x: float, y: float, w: float, h: float, title: str, n: str | None = None, accent: str = C["blue"]) -> None:
        self.rect(x, y, w, h, C["panel"], C["line"], 26)
        if n:
            self.rect(x + 28, y + 26, 58, 58, C["panel2"], accent, 16)
            self.text(x + 57, y + 66, n, 24, accent, 900, "middle", mono=True)
            self.text(x + 104, y + 66, title, 28, C["white"], 850)
        else:
            self.text(x + 28, y + 58, title, 28, accent, 850)

    def pill(self, x: float, y: float, w: float, h: float, text: str, fill: str = C["panel2"], color: str = C["ink"], size: int = 22) -> None:
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}" fill="{fill}" stroke="{C["line"]}" stroke-width="1.5"/>')
        self.text(x + w / 2, y + h / 2 + size * 0.36, text, size, color, 850, "middle")

    def formula(self, x: float, y: float, w: float, title: str, formula: str, note: str, accent: str = C["blue"]) -> float:
        self.rect(x, y, w, 190, "#0d141b", accent, 22)
        self.text(x + 28, y + 46, title, 22, accent, 850, mono=True)
        self.text(x + 28, y + 98, formula, 29, C["white"], 850, mono=True)
        self.lines(x + 28, y + 140, note, max(24, int(w / 18)), 20, C["muted"], 520)
        return y + 214

    def arrow(self, x1: float, y1: float, x2: float, y2: float, color: str = C["blue"], width: int = 5) -> None:
        self.add(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            f'stroke-width="{width}" stroke-linecap="round" marker-end="url(#arrow-{color[1:]})"/>'
        )

    def base(self) -> str:
        markers = []
        for color in [C["blue"], C["teal"], C["green"], C["amber"], C["orange"], C["red"], C["purple"]]:
            markers.append(
                f'<marker id="arrow-{color[1:]}" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">'
                f'<path d="M2,2 L10,6 L2,10 Z" fill="{color}"/></marker>'
            )
        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">
<title id="title">{e(self.title)}</title>
<desc id="desc">{e(self.subtitle)}</desc>
<defs>
{''.join(markers)}
<pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
  <path d="M42 0H0V42" fill="none" stroke="{C["line"]}" stroke-width="1" opacity=".34"/>
</pattern>
<linearGradient id="warm" x1="0" x2="1">
  <stop offset="0" stop-color="{C["orange"]}"/>
  <stop offset="1" stop-color="{C["red"]}"/>
</linearGradient>
<linearGradient id="cool" x1="0" x2="1">
  <stop offset="0" stop-color="{C["blue"]}"/>
  <stop offset="1" stop-color="{C["teal"]}"/>
</linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="{C["bg"]}"/>
<circle cx="1160" cy="40" r="310" fill="{C["blue"]}" opacity=".08"/>
<circle cx="120" cy="2770" r="380" fill="{C["orange"]}" opacity=".06"/>
<rect x="48" y="46" width="{W - 96}" height="{H - 92}" rx="42" fill="none" stroke="{C["line"]}" stroke-width="2"/>
<text x="88" y="126" font-family="JetBrains Mono, SFMono-Regular, Menlo, monospace" font-size="24" font-weight="900" fill="{C["blue"]}" letter-spacing="5">{e(self.code)}</text>
<text x="88" y="204" font-family="Avenir Next, Inter, Arial, sans-serif" font-size="58" font-weight="900" fill="{C["white"]}">{e(self.title)}</text>
<text x="90" y="258" font-family="Avenir Next, Inter, Arial, sans-serif" font-size="28" font-weight="500" fill="{C["muted"]}">{e(self.subtitle)}</text>
<line x1="88" y1="306" x2="1232" y2="306" stroke="{C["line"]}" stroke-width="2"/>
'''

    def render(self) -> str:
        return self.base() + "\n".join(self.parts) + "\n</svg>\n"

    def save(self, name: str) -> None:
        (SVG_DIR / name).write_text(self.render(), encoding="utf-8")


def mini_axis(b: Board, x: float, y: float, w: float, h: float, y_min: float, y_max: float, points: list[tuple[float, float]], color: str, label: str) -> None:
    b.rect(x, y, w, h, "#0d141b", C["line"], 18)
    b.add(f'<rect x="{x + 24}" y="{y + 24}" width="{w - 48}" height="{h - 58}" fill="url(#grid)" opacity=".55"/>')
    x0, x1 = x + 42, x + w - 28
    y0, y1 = y + h - 48, y + 30
    def sx(t: float) -> float:
        return x0 + (x1 - x0) * t
    def sy(v: float) -> float:
        return y0 - (y0 - y1) * ((v - y_min) / (y_max - y_min))
    d = " ".join(("M" if i == 0 else "L") + f"{sx(t):.1f},{sy(v):.1f}" for i, (t, v) in enumerate(points))
    b.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>')
    for t, v in points:
        b.add(f'<circle cx="{sx(t)}" cy="{sy(v)}" r="8" fill="{color}" stroke="{C["bg"]}" stroke-width="3"/>')
    b.text(x + 28, y + 34, label, 22, color, 900, mono=True)


def make_m1() -> None:
    b = Board("CAD 360 · M01", "Falha de sinal", "CAD e insulina insuficiente: glicose sobra, mas a celula le jejum.")
    b.card(88, 370, 1144, 420, "Cascata fisiologica central", "1", C["orange"])
    nodes = [
        (150, 500, 220, 82, "insulina baixa", C["red"]),
        (430, 500, 220, 82, "glucagon/catecol", C["amber"]),
        (710, 500, 220, 82, "lipólise", C["orange"]),
        (990, 500, 190, 82, "β-OHB", C["purple"]),
    ]
    for x, y, w, h, txt, col in nodes:
        b.pill(x, y, w, h, txt, col, C["bg"], 25)
    for a, c in zip(nodes, nodes[1:]):
        b.arrow(a[0] + a[2] + 12, a[1] + 41, c[0] - 12, c[1] + 41, C["orange"])
    b.lines(150, 648, "A doenca nao nasce da glicose alta: nasce da ausencia de freio hormonal sobre lipolise e cetogenese. A glicose e visivel; a cetona e causal.", 76, 29, C["ink"], 650)
    b.card(88, 860, 530, 520, "O loop que se sustenta", "2", C["blue"])
    loop = [("hiperglicemia", 190, 1010), ("diurese osmótica", 390, 1115), ("↓ volume / ↓ TFG", 270, 1260), ("menos clearance", 120, 1145)]
    for txt, x, y in loop:
        b.pill(x, y, 240, 58, txt, C["panel2"], C["ink"], 21)
    b.arrow(310, 1045, 418, 1110, C["blue"])
    b.arrow(485, 1165, 420, 1245, C["blue"])
    b.arrow(260, 1260, 180, 1200, C["blue"])
    b.arrow(170, 1130, 210, 1045, C["blue"])
    b.lines(128, 1328, "Volume quebra o ciclo; insulina fecha a cetogênese. Ordem importa quando o K esta fragil.", 34, 24)
    b.card(668, 860, 564, 520, "Tradução à beira do leito", "3", C["green"])
    for i, txt in enumerate(["glicose cai cedo", "gap/cetona fecha depois", "K despenca com tratamento", "cloro pode segurar o pH"]):
        b.pill(720, 970 + i * 82, 340, 56, txt, [C["blue"], C["purple"], C["amber"], C["orange"]][i], C["bg"], 22)
    b.lines(720, 1315, "Lei operacional: titule pela cetose/gap e proteja K. Glicemia isolada e o pior volante possivel.", 36, 24, C["ink"], 650)
    b.card(88, 1460, 1144, 1020, "A régua mental", "4", C["purple"])
    rows = [
        ("Glicose", "marcador barulhento", "desce antes da doença resolver"),
        ("β-OHB/gap", "eixo da doença", "manda na duração da insulina"),
        ("K sérico", "fotografia ruim do estoque", "define se insulina é segura"),
        ("Cloro", "assinatura do tratamento", "explica pH baixo residual"),
        ("Osm efetiva", "tonicidade", "guia risco neurológico em HHS/misto"),
    ]
    y = 1585
    for a, c, d in rows:
        b.text(150, y, a, 28, C["white"], 850)
        b.text(390, y, c, 25, C["blue"], 750)
        b.lines(680, y, d, 28, 24, C["muted"], 520)
        b.add(f'<line x1="140" y1="{y + 32}" x2="1180" y2="{y + 32}" stroke="{C["line"]}" stroke-width="1.5"/>')
        y += 132
    b.pill(235, 2365, 850, 72, "A glicose e o ruído; a cetona e o crime; o potássio e a trava.", C["panel2"], C["white"], 28)
    b.save("cad-lote1-01-m01-falha-de-sinal.svg")


def make_m2() -> None:
    b = Board("CAD 360 · M02", "Fenótipos", "O mesmo mecanismo aparece com glicoses, pH e osmolaridades diferentes.")
    b.card(88, 370, 1144, 610, "Mapa rapido: 8 fenomenos auditados", "1", C["blue"])
    headers = ["fenótipo", "glicose", "cetona", "pH/HCO3", "risco"]
    xs = [130, 390, 555, 720, 900]
    for x, h in zip(xs, headers):
        b.text(x, 470, h, 18, C["blue"], 900, mono=True)
    rows = [(p["name"], p["glucose"], p["ketone"], p["acid"], p["risk"]) for p in DATA["phenotypes"]]
    y = 532
    for row in rows:
        for x, val in zip(xs, row):
            b.text(x, y, val, 18 if x != 130 else 19, C["ink"] if x == 130 else C["muted"], 720 if x == 130 else 650)
        b.add(f'<line x1="120" y1="{y + 24}" x2="1180" y2="{y + 24}" stroke="{C["line"]}" stroke-width="1"/>')
        y += 52
    b.pill(195, 910, 930, 50, "Fenótipo é decisão: cetose, osmolaridade, K e cloro competem pela prioridade.", C["panel2"], C["white"], 20)
    b.card(88, 1060, 540, 610, "Armadilha do destro", "2", C["orange"])
    b.pill(145, 1185, 260, 70, "glicose 190", C["amber"], C["bg"], 28)
    b.text(420, 1232, "não exclui CAD", 28, C["white"], 900)
    b.lines(145, 1325, "SGLT2, gestação, jejum, vômitos e tratamento parcial podem manter glicemia modesta enquanto β-OHB e gap seguem ativos.", 34, 27)
    b.pill(145, 1535, 410, 58, "procure cetose + acidose", C["purple"], C["bg"], 23)
    b.card(692, 1060, 540, 610, "Continuum CAD-HHS", "3", C["teal"])
    mini_axis(b, 745, 1180, 430, 220, 0, 10, [(0, 8), (0.35, 7), (0.7, 3), (1, 1)], C["purple"], "cetose")
    mini_axis(b, 745, 1420, 430, 220, 250, 700, [(0, 280), (0.35, 360), (0.7, 560), (1, 680)], C["teal"], "glicose/osm")
    b.card(88, 1745, 1144, 700, "Nome certo evita conduta errada", "4", C["green"])
    blocks = [
        ("CAD estrita", "cetose significativa + acidose metabólica", C["red"]),
        ("cetose diabética de alto risco", "cetose sem acidose franca; vigiar evolução", C["amber"]),
        ("CAD parcialmente tratada", "glicose melhorou; gap/cetona ainda mandam", C["purple"]),
        ("HHS com cetose leve", "hiperosmolar domina; fluido e velocidade primeiro", C["teal"]),
    ]
    for i, (t, d, col) in enumerate(blocks):
        x = 145 + (i % 2) * 510
        y = 1880 + (i // 2) * 225
        b.rect(x, y, 455, 190, "#0d141b", col, 24)
        b.text(x + 28, y + 55, t, 28, col, 900)
        b.lines(x + 28, y + 105, d, 26, 24, C["muted"], 560)
    b.pill(225, 2340, 870, 70, "Pergunta-mãe: qual eixo domina agora - cetose, osmolaridade, K ou cloro?", C["panel2"], C["white"], 26)
    b.save("cad-lote1-02-m02-fenotipos.svg")


def make_m3() -> None:
    b = Board("CAD 360 · M03", "Laboratório mínimo", "Cada exame responde uma pergunta; nenhum responde todas.")
    b.card(88, 370, 1144, 560, "O que cada dado sabe dizer", "1", C["blue"])
    items = [
        ("Dextro", "glicose agora", "não mede cetose nem resolução"),
        ("Gasometria", "pH, pCO2, HCO3, lactato", "não mede estoque corporal de K"),
        ("Ionograma", "Na/K/Cl e coerência", "não prova causa da acidose"),
        ("β-OHB", "cetona causal", "melhor marcador de resolução"),
        ("Urina", "AcAc/acetona", "pode piorar enquanto melhora"),
    ]
    y = 505
    for name, says, nots in items:
        b.text(140, y, name, 28, C["white"], 850)
        b.text(350, y, says, 24, C["green"], 720)
        b.lines(710, y, nots, 31, 23, C["muted"], 520)
        b.add(f'<line x1="130" y1="{y + 34}" x2="1188" y2="{y + 34}" stroke="{C["line"]}" stroke-width="1.4"/>')
        y += 84
    b.card(88, 1020, 540, 630, "Urina cetônica: atraso redox", "2", C["purple"])
    b.text(145, 1160, "β-OHB  ⇄  AcAc", 42, C["white"], 900, mono=True)
    b.lines(145, 1245, "No pico da CAD predomina β-OHB. A fita detecta AcAc, nao β-OHB. Na melhora, β-OHB vira AcAc e a urina pode parecer pior.", 34, 27)
    b.pill(145, 1510, 385, 60, "não titule por fita isolada", C["purple"], C["bg"], 24)
    b.card(692, 1020, 540, 630, "Osmolaridade: rótulo obrigatório", "3", C["orange"])
    b.formula(740, 1138, 438, "default em CAD/HHS", "2Na + glicose/18", "osm efetiva = tonicidade; ureia fica fora.", C["green"])
    b.formula(740, 1360, 438, "somente osm-gap", "2Na + glic/18 + BUN/2,8", "ou ureia/6; comparar com osm medida.", C["amber"])
    b.card(88, 1735, 1144, 620, "Leitura em camadas", "4", C["teal"])
    layers = ["pH", "pCO2/Winter", "HCO3/BE", "lactato", "Na/K/Cl", "AG corrigido", "Δ/Δ", "osm efetiva", "tendência temporal", "paciente"]
    for i, layer in enumerate(layers):
        x = 145 + (i % 2) * 520
        y = 1855 + (i // 2) * 82
        b.pill(x, y, 340, 52, f"{i+1}. {layer}", C["panel2"], C["ink"], 22)
    b.pill(245, 2255, 830, 70, "Gasometria isolada é fotografia; série temporal é filme.", C["teal"], C["bg"], 28)
    b.save("cad-lote1-03-m03-laboratorio-minimo.svg")


def make_m4() -> None:
    ex = DATA["examples"]["module4_clean_ag"]
    b = Board("CAD 360 · M04", "Calculadoras canônicas", "Uma fonte de verdade para AG, Δ/Δ, Winter, Na corrigido e osm efetiva.")
    b.card(88, 370, 1144, 620, "Seis calculadoras do core", "1", C["blue"])
    y = 492
    formulas = [
        ("AG", "Na - (Cl + HCO3)", "ânions não medidos; normal operacional 8-12"),
        ("AGc", "AG + 2,5 x (4 - albumina)", "hipoalbuminemia esconde gap"),
        ("Δ/Δ", "(AGc - 12) / (24 - HCO3)", "detecta mistura hiperclorêmica ou alcalose somada"),
        ("Winter", "1,5 x HCO3 + 8 +/- 2", "testa compensação respiratória"),
        ("Na corr", "Na + fator x ((gli-100)/100)", "fator 1,6; usar 2,4 se glicose >400"),
        ("Osm efetiva", "2 x Na + glicose/18", "default para tonicidade em CAD/HHS"),
    ]
    for name, f, note in formulas:
        b.text(140, y, name, 21, C["blue"], 900, mono=True)
        b.text(365, y, f, 22, C["white"], 850, mono=True)
        b.lines(845, y, note, 25, 19, C["muted"], 500)
        y += 76
    b.card(88, 1040, 1144, 760, "Δ/Δ corrigido: sem rótulo invertido", "2", C["red"])
    bands = DATA["clinical_policy"]["delta_ratio"]["canon"]
    colors = [C["orange"], C["green"], C["purple"]]
    for i, band in enumerate(bands):
        yy = 1168 + i * 178
        b.rect(145, yy, 980, 148, "#0d141b", colors[i], 24)
        b.pill(175, yy + 32, 150, 68, band["range"], colors[i], C["bg"], 34)
        b.text(365, yy + 55, band["label"], 27, C["white"], 900)
        b.lines(365, yy + 94, band["meaning"], 55, 22, C["muted"], 520)
    b.pill(175, 1705, 950, 62, "Canon: <1 = hiperclorêmica somada · 1-2 = AGMA limpa · >2 = alcalose", C["panel2"], C["white"], 23)
    b.card(88, 1895, 548, 550, "Exemplo validado", "3", C["green"])
    pairs = [
        ("Na/Cl/HCO3", f'{ex["na"]}/{ex["cl"]}/{ex["hco3"]}'),
        ("AG", f'{ex["ag"]}'),
        ("albumina", f'{ex["albumin"]}'),
        ("AGc", f'{ex["agc"]}'),
        ("Δ/Δ", f'{ex["delta_ratio"]:.2f}'),
        ("Winter", ex["winter"]),
        ("Osm efetiva", f'{ex["effective_osm"]:.1f}'),
    ]
    y = 2015
    for k, v in pairs:
        b.text(145, y, k, 24, C["muted"], 700)
        b.text(570, y, v, 28, C["white"], 900, "end", mono=True)
        y += 58
    b.pill(145, 2460, 420, 56, "Δ/Δ 1,23 = AGMA limpa", C["green"], C["bg"], 23)
    b.card(684, 1895, 548, 550, "Osm: não misturar usos", "4", C["amber"])
    b.formula(735, 2015, 440, "tonicidade", "2Na + gli/18", "uso default em CAD/HHS.", C["green"])
    b.formula(735, 2235, 440, "osm-gap", "+ BUN/2,8 ou ureia/6", "so quando houver osm medida.", C["amber"])
    b.rect(175, 2550, 970, 135, C["red"], C["red"], 40)
    b.lines(235, 2612, "Número certo com rótulo errado ainda ensina erro. Aqui a aritmética e o rótulo são versionados.", 60, 27, C["bg"], 900)
    b.save("cad-lote1-04-m04-calculadoras-canonicas.svg")


def make_m5() -> None:
    b = Board("CAD 360 · M05", "Cloro e pH residual", "Quando a cetose sai e o cloro fica segurando o bicarbonato.")
    b.card(88, 370, 1144, 760, "A assinatura da cauda hiperclorêmica", "1", C["orange"])
    mini_axis(b, 140, 505, 490, 300, 10, 28, [(0, 26), (0.25, 22), (0.5, 18), (0.75, 15), (1, 13)], C["green"], "AG corrigido ↓")
    mini_axis(b, 690, 505, 490, 300, 96, 112, [(0, 99), (0.25, 102), (0.5, 105), (0.75, 108), (1, 110)], C["orange"], "Cloro ↑")
    mini_axis(b, 140, 835, 490, 240, 7.05, 7.4, [(0, 7.15), (0.25, 7.22), (0.5, 7.28), (0.75, 7.30), (1, 7.31)], C["blue"], "pH melhora pouco")
    mini_axis(b, 690, 835, 490, 240, 0.1, 1.6, [(0, 1.25), (0.25, 0.9), (0.5, 0.71), (0.75, 0.55), (1, 0.39)], C["red"], "Δ/Δ cai <1")
    b.card(88, 1210, 540, 660, "O erro de conduta", "2", C["red"])
    b.lines(145, 1340, "Ler pH baixo residual como 'cetose não tratada' e subir insulina fabrica hipoglicemia e hipocalemia.", 34, 30, C["ink"], 700)
    b.pill(145, 1585, 400, 66, "cloro não obedece insulina", C["red"], C["bg"], 25)
    b.lines(145, 1715, "Se AG/cetona converge e Δ/Δ < 1, o alvo muda: pare de perseguir pH com insulina.", 32, 26)
    b.card(692, 1210, 540, 660, "O ajuste certo", "3", C["green"])
    for i, txt in enumerate(["balanceado quando possível", "K antecipatório", "titular por gap/cetona", "aceitar piso hiperclorêmico"]):
        b.pill(755, 1340 + i * 96, 360, 60, txt, [C["teal"], C["amber"], C["purple"], C["green"]][i], C["bg"], 23)
    b.card(88, 1960, 1144, 390, "Interpretação operacional", "4", C["purple"])
    b.lines(145, 2090, "Δ/Δ < 1 não diz 'CAD pura'. Diz o oposto: há componente normal-gap/hiperclorêmico somado. Na CAD em resolução, isso costuma ser a ressuscitação aparecendo no laboratório.", 74, 31, C["ink"], 700)
    b.pill(235, 2300, 850, 72, "Gap manda na cetose; cloro explica o pH que ficou para trás.", C["panel2"], C["white"], 27)
    b.save("cad-lote1-05-m05-cloro-ph-residual.svg")


def make_m6() -> None:
    b = Board("CAD 360 · M06", "Insulina com segurança", "Insulina fecha cetogênese; glicose permite continuar; K decide se pode.")
    b.card(88, 370, 1144, 730, "Algoritmo mínimo", "1", C["blue"])
    steps = [
        ("cetose + acidose?", "sim: tratar CAD", C["purple"]),
        ("K >= 3,5?", "não: repor K antes", C["amber"]),
        ("glicose < 250?", "sim: dextrose junto", C["green"]),
        ("gap/cetona fechou?", "não: manter insulina", C["blue"]),
    ]
    y = 500
    for i, (q, a, col) in enumerate(steps):
        b.rect(160, y, 430, 92, "#0d141b", col, 20)
        b.text(190, y + 58, q, 27, C["white"], 850)
        b.arrow(600, y + 46, 720, y + 46, col)
        b.pill(750, y + 14, 360, 64, a, col, C["bg"], 23)
        if i < len(steps) - 1:
            b.arrow(375, y + 110, 375, y + 150, C["dim"])
        y += 150
    b.card(88, 1190, 540, 610, "Glicose não é freio", "2", C["green"])
    b.text(145, 1320, "glicose 133", 38, C["green"], 900, mono=True)
    b.text(145, 1385, "+ gap aberto", 38, C["red"], 900, mono=True)
    b.lines(145, 1480, "Isso não manda desligar insulina. Manda ligar dextrose para permitir insulina ate a cetose fechar.", 34, 29)
    b.pill(145, 1710, 400, 62, "dextrose = cinto de segurança", C["green"], C["bg"], 23)
    b.card(692, 1190, 540, 610, "K é a trava", "3", C["amber"])
    mini_axis(b, 755, 1320, 390, 250, 2.8, 5.2, [(0, 4.8), (0.35, 4.1), (0.65, 3.4), (1, 3.0)], C["amber"], "K sérico")
    b.lines(755, 1630, "K normal na chegada pode esconder déficit corporal. Insulina e volume revelam o buraco.", 27, 26)
    b.card(88, 1885, 1144, 540, "Regra de plantão: Apêndice A", "4", C["red"])
    rows = [
        ("K < 3,5", "segurar insulina, repor K e monitorizar"),
        ("K 3,5-5,0", "insulina permitida + K para alvo 4-5"),
        ("K >= 5,0", "sem K inicial, ECG e recheck frequente"),
        ("gli baixa/modesta", "dextrose junto; não abandonar cetose"),
    ]
    y = 2015
    for a, d in rows:
        b.text(150, y, a, 29, C["amber"], 900, mono=True)
        b.lines(520, y, d, 37, 26, C["ink"], 650)
        y += 82
    b.pill(205, 2370, 910, 72, "Alvo K 4-5. A doutrina do projeto é K <5,0.", C["panel2"], C["white"], 27)
    b.save("cad-lote1-06-m06-insulina-seguranca.svg")


def make_ex1() -> None:
    ex = DATA["examples"]["exercise_delta_071"]
    b = Board("CAD 360 · EX01", "Exercício: Δ/Δ 0,71", "O mesmo número agora tem uma leitura única em todo o lote.")
    b.card(88, 370, 1144, 500, "Dados do caso", "1", C["blue"])
    vals = [("Na", ex["na"]), ("Cl", ex["cl"]), ("HCO3", ex["hco3"]), ("AG", ex["ag"]), ("glicose", ex["glucose"])]
    for i, (k, v) in enumerate(vals):
        x = 150 + i * 205
        b.rect(x, 520, 160, 150, "#0d141b", C["line"], 20)
        b.text(x + 80, 575, k, 23, C["muted"], 850, "middle", mono=True)
        b.text(x + 80, 640, v, 40, C["white"], 950, "middle", mono=True)
    b.lines(150, 760, "Pergunta: o Δ/Δ abaixo representa acidose de gap alto pura ou mistura com cauda hiperclorêmica?", 65, 29, C["ink"], 700)
    b.card(88, 965, 1144, 590, "Cálculo transparente", "2", C["purple"])
    b.text(150, 1115, "Δ/Δ = (AG - 12) / (24 - HCO3)", 36, C["white"], 900, mono=True)
    b.text(150, 1215, "= (22 - 12) / (24 - 10)", 38, C["white"], 900, mono=True)
    b.text(150, 1315, "= 10 / 14 = 0,71", 46, C["amber"], 950, mono=True)
    b.pill(710, 1245, 390, 76, "< 1", C["orange"], C["bg"], 36)
    b.lines(710, 1375, "Logo: AGMA + componente hiperclorêmico/NAGMA. Não é CAD pura.", 28, 27, C["ink"], 750)
    b.card(88, 1645, 1144, 590, "Por que isso muda decisão", "3", C["red"])
    b.lines(150, 1780, "Se o gap está melhorando e o cloro subiu, parte do pH baixo residual não responde a mais insulina. Perseguir esse pH pode gerar hipoglicemia e hipocalemia.", 72, 31, C["ink"], 700)
    b.pill(150, 2045, 460, 64, "rótulo antigo errado: 'pura'", C["red"], C["bg"], 24)
    b.pill(650, 2045, 470, 64, "rótulo corrigido: 'hiperclorêmica'", C["green"], C["bg"], 24)
    b.card(88, 2320, 1144, 250, "Resposta canônica", "4", C["green"])
    b.text(150, 2465, ex["interpretation"], 34, C["white"], 900)
    b.save("cad-lote1-07-ex01-delta-071-corrigido.svg")


def make_ex2() -> None:
    ex = DATA["examples"]["osmolality_pair"]
    b = Board("CAD 360 · EX02", "Exercício: osmolaridade", "Efetiva por padrão; total/calculada só para osm-gap.")
    b.card(88, 370, 1144, 460, "Dados", "1", C["blue"])
    vals = [("Na", ex["na"]), ("glicose", ex["glucose"]), ("BUN", ex["bun"])]
    for i, (k, v) in enumerate(vals):
        x = 210 + i * 300
        b.rect(x, 515, 220, 150, "#0d141b", C["line"], 20)
        b.text(x + 110, 570, k, 23, C["muted"], 850, "middle", mono=True)
        b.text(x + 110, 638, v, 42, C["white"], 950, "middle", mono=True)
    b.lines(150, 745, "Pergunta: qual número guia tonicidade na CAD/HHS? E qual número só entra se a pergunta for osm-gap?", 66, 28, C["ink"], 700)
    b.card(88, 930, 540, 680, "Default: osm efetiva", "2", C["green"])
    b.text(145, 1080, "2Na + glicose/18", 36, C["white"], 900, mono=True)
    b.text(145, 1190, "= 2x136 + 360/18", 33, C["white"], 850, mono=True)
    b.text(145, 1300, "= 292 mOsm/kg", 46, C["green"], 950, mono=True)
    b.lines(145, 1415, "Este e o numero de tonicidade: ureia atravessa membrana e nao sustenta gradiente efetivo.", 34, 27)
    b.card(692, 930, 540, 680, "Só para osm-gap", "3", C["amber"])
    b.text(748, 1080, "2Na + gli/18 + BUN/2,8", 31, C["white"], 900, mono=True)
    b.text(748, 1190, "= 292 + 42/2,8", 33, C["white"], 850, mono=True)
    b.text(748, 1300, "= 307 mOsm/kg", 46, C["amber"], 950, mono=True)
    b.lines(748, 1415, "Use apenas para comparar com osm medida e calcular gap osmolar. Não rotule como tonicidade.", 32, 27)
    b.card(88, 1705, 1144, 565, "Padronização do projeto", "4", C["red"])
    b.pill(150, 1845, 420, 66, "CAD/HHS: osm efetiva", C["green"], C["bg"], 25)
    b.text(610, 1890, "2Na + glicose/18", 31, C["white"], 900, mono=True)
    b.pill(150, 1975, 420, 66, "osm-gap: osm total", C["amber"], C["bg"], 25)
    b.text(610, 2020, "+ BUN/2,8 ou ureia/6", 31, C["white"], 900, mono=True)
    b.lines(150, 2145, "Misturar as duas sem rótulo troca uma pergunta de tonicidade por uma pergunta de osm-gap. Em ensino, isso vira erro de decisão.", 72, 30, C["ink"], 700)
    b.pill(235, 2340, 850, 72, "Default visual de todas as pranchas: Osm efetiva, não osm total.", C["panel2"], C["white"], 27)
    b.save("cad-lote1-08-ex02-osm-efetiva-total.svg")


def main() -> None:
    for maker in [make_m1, make_m2, make_m3, make_m4, make_m5, make_m6, make_ex1, make_ex2]:
        maker()
    print(f"Generated {len(list(SVG_DIR.glob('*.svg')))} SVG files in {SVG_DIR}")


if __name__ == "__main__":
    main()
