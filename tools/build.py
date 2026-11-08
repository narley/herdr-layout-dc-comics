#!/usr/bin/env python3
"""Build the DC Comics Herdr layout from the tested Matrix mod contracts."""
import json
import shutil
from pathlib import Path

SOURCE = Path.home() / ".config/herdr/matrix/build"
OUT = Path(__file__).parent / "build"
MODS = ("chrome", "spaces", "agents", "tabs", "status")

for kind in MODS:
    shutil.copytree(SOURCE / "mods" / f"matrix-{kind}", OUT / "mods" / f"dc-{kind}", dirs_exist_ok=True)
for path in (OUT / "mods/dc-agents/ops").glob("*.svg"):
    if path.name != "alert.svg":
        path.unlink()

for path in (OUT / "mods").rglob("*.js"):
    content = path.read_text().replace("matrix-", "dc-").replace("matrix.", "dc.")
    if path.parent.name == "dc-chrome" and path.name == "main.js":
        content = content.replace('import { View, div, svg }', 'import { View, div, svg, image }')
        content = content.replace('"follow the white rabbit', '"answer the signal').replace('"🐇"', '"✦"')
        content = content.replace('"the construct // live feed"', '"GOTHAM // NIGHT WATCH"').replace('"the construct // feed paused"', '"GOTHAM // SIGNAL PAUSED"')
        content = content.replace('const TITLE = [', 'const TITLE = [')
        start = content.index('const TITLE = [')
        end = content.index(';', start)
        content = content[:start] + 'const TITLE = ["DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "GOTHAM", "DC HEROES"]' + content[end:]
        content = content.replace('"#cdeed5"', '"#fff1b0"')
        content = content.replace('.children(rain({ width, height', '.child(image("mods/dc-chrome/gotham-sidebar.svg").absolute().size_full())\n      .children(rain({ width, height')
    if path.parent.name == "dc-agents" and path.name == "main.js":
        start = content.index('const HEROES =')
        end = content.index('const CAST =', start)
        content = content[:start] + '''const HEROES = ["batman", "superman", "wonder-woman", "flash", "green-lantern", "aquaman", "cyborg", "harley-quinn", "joker", "catwoman"];
const HERO_NAME = Object.fromEntries(HEROES.map((hero) => [hero, hero.replaceAll("-", " ").toUpperCase()]));
const OPS = "mods/dc-agents/ops";
const FX = Object.fromEntries(HEROES.map((hero) => [hero, ["opacity", { from: 0.25, to: 1, period: 900 }]]));
''' + content[end:]
        content = content.replace('"JACKED IN"', '"ON PATROL"').replace('"WAKE UP"', '"NEEDS HERO"').replace('"W4KE UP"', '"NEEDS HERO"')
        content = content.replace('"☎ RINGING"', '"MISSION DONE"').replace('"  RINGING"', '"MISSION DONE"').replace('"STANDBY"', '"OFF DUTY"')
        content = content.replace('"SIGNAL "', '"FOCUS  "').replace('"POWER  "', '"ENERGY "').replace('OPERATORS [', 'HEROES [')
        content = content.replace('jacked in', 'on patrol').replace('No operators', 'No heroes').replace('Follow the white rabbit.', 'Answer the signal.')
        content = content.replace('hero === "auditor" ? t.blocked : color', 'color')
    if path.parent.name == "dc-spaces" and path.name == "main.js":
        content = content.replace('SECTORS', 'DISTRICTS').replace('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789', '★✦◆◇◈▣▤▥0123456789')
    if path.parent.name == "dc-status" and path.name == "main.js":
        content = content.replace('OPERATORS', 'HEROES').replace('operators', 'heroes').replace('jacked in', 'on patrol')
    if path.name == "rain.js":
        content = content.replace('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z:=*+-<>¦', '★✦◆◇◈▣▤▥0123456789Z:=*+-<>¦')
    path.write_text(content)

layout = json.loads((SOURCE / "layouts/matrix.json").read_text())
def adapt(value):
    if isinstance(value, dict):
        return {key: adapt(item) for key, item in value.items()}
    if isinstance(value, list):
        return [adapt(item) for item in value]
    if isinstance(value, str):
        return value.replace("matrix-", "dc-").replace("rain-sidebar.png", "gotham-sidebar.svg").replace("rain-backdrop.png", "gotham-backdrop.svg").replace("#22d65c40", "#f4c54540")
    return value
layout = adapt(layout)
(OUT / "layouts").mkdir(parents=True, exist_ok=True)
(OUT / "layouts/dc-comics.json").write_text(json.dumps(layout, indent=2) + "\n")

theme = json.loads((SOURCE / "themes/matrix.json").read_text())
palette = {"#010805": "#101a2d", "#bfeccb": "#e7edf6", "#0f4d22": "#293b5a", "#22d65c": "#f4c545",
           "#001a06": "#1a2232", "#3f9a5b": "#667e9e", "#74c98a": "#9bb0ca", "#000000": "#0b1425",
           "#010b05": "#111d32", "#02120a": "#17263e", "#031a0d": "#1d304b", "#062a14": "#294367", "#0a3a1c": "#253b5a"}
def recolor(value):
    if isinstance(value, dict):
        return {key: recolor(item) for key, item in value.items()}
    if isinstance(value, list):
        return [recolor(item) for item in value]
    if isinstance(value, str):
        for old, new in palette.items():
            value = value.replace(old, new)
        return value
    return value
theme = recolor(theme)
theme["colors"].update(working="#53cfae", blocked="#f26875", done="#f4c545", idle="#7f98b8", accent="#f4c545", border="#f4c54545")
(OUT / "themes").mkdir(parents=True, exist_ok=True)
(OUT / "themes/dc-comics.json").write_text(json.dumps(theme, indent=2) + "\n")

skyline = '<path d="M0 170v-55h18V83h22v32h12V65h20v42h14V90h22v25h18V71h18v44h14V48h26v67h20V81h16v34h18V59h25v56h19v55z" fill="#0b1425"/><path d="M0 146h284" stroke="#f4c545" stroke-opacity=".22"/>'
windows = ''.join(f'<rect x="{x}" y="{y}" width="3" height="5" fill="#f4c545" opacity=".55"/>' for x in range(16, 274, 19) for y in (106, 122, 138))
signal = '<circle cx="210" cy="45" r="30" fill="#f4c545" opacity=".18"/><path d="M190 45l7-4 3-8 5 5 5-5 3 8 7 4-10 2-5 5-5-5z" fill="#f4c545" opacity=".8"/>'
for name, view in (("gotham-sidebar", "0 0 284 170"), ("gotham-backdrop", "0 0 284 170")):
    body = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}"><rect width="284" height="170" fill="#111d32"/>{signal}{skyline}{windows}</svg>\n'
    (OUT / "mods/dc-chrome" / f"{name}.svg").write_text(body)
