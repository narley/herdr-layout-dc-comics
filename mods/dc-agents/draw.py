#!/usr/bin/env python3
"""Draw stylized, full-body SVG portraits for the Matrix character cards."""
from pathlib import Path

OUT = Path(__file__).parent / "ops"
GREEN = "#42e87a"

# name, skin, hair, coat, shirt, hairstyle, signature detail
CAST = {
    "neo": ("#d5a484", "#181719", "#171b1d", "#202326", "swept", "glasses"),
    "trinity": ("#d9ae94", "#151416", "#141719", "#25272a", "bob", "glasses"),
    "morpheus": ("#754b36", "#1b1918", "#272329", "#4a2340", "bald", "round-glasses"),
    "niobe": ("#a56b4c", "#181514", "#20252a", "#332b30", "bun", "earring"),
    "tank": ("#a76d4c", "#211b18", "#353d35", "#222a23", "short", "headset"),
    "dozer": ("#754d37", "#1a1817", "#353b31", "#242920", "short", "headset"),
    "link": ("#8a5b43", "#191816", "#353b3b", "#283030", "short", "headset"),
    "bugs": ("#e1b99e", "#202126", "#22252b", "#333846", "undercut", "blue-hair"),
    "agent-smith": ("#e0b99b", "#282523", "#25272a", "#f1f1e9", "parted", "glasses"),
    "cypher": ("#d9a384", "#211b19", "#393634", "#272422", "receding", "goatee"),
    "oracle": ("#674231", "#282321", "#745b43", "#b98a62", "short", "round-glasses"),
    "architect": ("#e6c4a9", "#eeeeea", "#dedbd2", "#f6f4ef", "white", "round-glasses"),
    "merovingian": ("#d7ae92", "#302620", "#333036", "#67334d", "slick", "cravat"),
    "analyst": ("#d5a887", "#392b27", "#42464b", "#7b8794", "parted", "blue-glasses"),
}


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">{body}</svg>\n'


def portrait(name, state):
    skin, hair, coat, shirt, style, detail = CAST[name]
    red = state == "blocked"
    work = state == "work"
    glow = "#ff5656" if red else GREEN
    body = [f'<ellipse cx="60" cy="82" rx="48" ry="72" fill="{glow}" opacity=".08"/>',
            '<ellipse cx="60" cy="153" rx="27" ry="4" fill="#000" opacity=".35"/>',
            '<path d="M44 92h14l-2 48H45z M63 92h14l-2 48H64z" fill="#181a1c"/>',
            '<path d="M44 137h14v11H40q-2-5 4-11 M64 137h13l5 11H62z" fill="#111315"/>']
    if name in ("neo", "trinity", "morpheus", "niobe", "merovingian"):
        body.append(f'<path d="M44 57 Q60 51 76 57 L84 139 H36z" fill="{coat}"/>')
    else:
        body.append(f'<path d="M43 58 Q60 51 77 58 L78 103 H42z" fill="{coat}"/>')
    body.extend([f'<path d="M54 56h12l3 39H51z" fill="{shirt}"/>',
                 f'<path d="M46 62 Q36 65 36 78 L39 100" fill="none" stroke="{coat}" stroke-width="10" stroke-linecap="round"/>',
                 f'<path d="M74 62 Q84 65 84 78 L81 {76 if work else 100}" fill="none" stroke="{coat}" stroke-width="10" stroke-linecap="round"/>',
                 f'<circle cx="39" cy="100" r="4" fill="{skin}"/><circle cx="81" cy="{76 if work else 100}" r="4" fill="{skin}"/>',
                 f'<rect x="56" y="45" width="8" height="13" rx="3" fill="{skin}"/>',
                 f'<ellipse cx="60" cy="31" rx="16" ry="20" fill="{skin}"/>',
                 '<path d="M51 33h5m8 0h5" stroke="#302722" stroke-width="1.4" stroke-linecap="round"/>',
                 '<path d="M60 36l-1 5 2 1m-5 4q4 2 8 0" fill="none" stroke="#795444" stroke-width="1"/>'])
    hair_shapes = {
        "swept": 'M43 29Q41 9 61 9q19 0 16 19-7-9-15-11-10 10-19 12',
        "bob": 'M42 44Q37 8 60 8q24 0 19 36l-7-3-1-18q-12-9-22 0l-1 18z',
        "bun": 'M45 29Q42 13 57 12q17-3 19 17l-6-8q-11 6-25 8',
        "short": 'M44 26Q45 12 60 12q16 0 16 14-15-8-32 0',
        "undercut": 'M44 24Q49 8 65 10q14 1 13 15-12-10-23-7z',
        "parted": 'M44 27Q43 11 60 11q17 0 16 16-9-10-16-11-7 8-16 11',
        "receding": 'M43 26Q44 12 60 13q16 0 17 13l-8-7-4 5-7-5-7 6z',
        "white": 'M44 28Q43 11 60 11q18 0 16 17l-7-8-11-1-14 9',
        "slick": 'M44 27Q40 12 59 10q18-2 18 17-8-11-33 0',
    }
    if style == "bun":
        body.append(f'<circle cx="73" cy="13" r="8" fill="{hair}"/>')
    if style != "bald":
        body.append(f'<path d="{hair_shapes[style]}" fill="{hair}"/>')
    if style == "undercut":
        body.append('<path d="M67 11q12 1 11 14" fill="none" stroke="#4e83a2" stroke-width="5"/>')
    if "glasses" in detail:
        lens = "#6d8ea4" if detail == "blue-glasses" else "#17191b"
        radius = 'rx="5"' if detail == "round-glasses" else 'rx="2"'
        body.append(f'<rect x="46" y="29" width="12" height="8" {radius} fill="{lens}" stroke="#3b3b3b"/><rect x="62" y="29" width="12" height="8" {radius} fill="{lens}" stroke="#3b3b3b"/><path d="M58 32h4" stroke="#252525" stroke-width="2"/>')
    if detail == "headset":
        body.append('<path d="M42 32Q42 9 60 9" fill="none" stroke="#575e58" stroke-width="3"/><rect x="40" y="29" width="6" height="11" rx="2" fill="#555"/><path d="M43 40q3 9 13 9" fill="none" stroke="#555"/>')
    if detail == "goatee":
        body.append(f'<path d="M55 47q5 11 10 0" fill="{hair}"/>')
    if detail == "earring":
        body.append('<circle cx="77" cy="40" r="2" fill="#d3b36d"/>')
    if detail == "cravat":
        body.append('<path d="M56 54l4 9 4-9-4 25z" fill="#a9748e"/>')
    if name == "agent-smith":
        body.append('<path d="M59 57l-3 16 4 8 4-8-3-16z" fill="#16191c"/>')
    if work:
        body.append(f'<circle cx="91" cy="65" r="15" fill="none" stroke="{GREEN}" opacity=".7"/><path d="M83 65h16m-8-8v16" stroke="{GREEN}" opacity=".7"/>')
    return svg("".join(body))


OUT.mkdir(exist_ok=True)
for name in CAST:
    for state in ("rest", "work", "blocked"):
        (OUT / f"{name}-{state}.svg").write_text(portrait(name, state))
    (OUT / f"{name}-fx.svg").write_text(svg(f'<circle cx="91" cy="65" r="17" fill="none" stroke="{GREEN}" stroke-width="1.5" opacity=".7"/><circle cx="91" cy="65" r="3" fill="{GREEN}"/>'))
