#!/usr/bin/env python3
"""Draw ten comic-style vector hero and villain portraits for Herdr cards."""
from pathlib import Path

OUT = Path(__file__).parent / "build/mods/dc-agents/ops"
CAST = {
    "batman": ("#222b42", "#151c2b", "#f4c545", "#d7a782", "cowl", "bat"),
    "superman": ("#2466b5", "#c6383e", "#e8bb43", "#d4a07f", "curl", "diamond"),
    "wonder-woman": ("#b63847", "#244b8b", "#f2c951", "#b87954", "tiara", "star"),
    "flash": ("#b82c39", "#9b2631", "#f3d458", "#d5a17c", "lightning", "bolt"),
    "green-lantern": ("#287c5a", "#1b292d", "#89e69e", "#a96f4e", "visor", "ring"),
    "aquaman": ("#d8893b", "#297966", "#f2d65b", "#d6ad83", "long", "trident"),
    "cyborg": ("#8a949e", "#2a3743", "#ef5c63", "#754b38", "cyber", "core"),
    "harley-quinn": ("#c43f58", "#304a83", "#f7e7dc", "#eac1a8", "pigtails", "diamond"),
    "joker": ("#69428e", "#299361", "#f0e6da", "#e6d3c4", "spikes", "smile"),
    "catwoman": ("#313445", "#11131c", "#f5c36d", "#a36b50", "ears", "cat"),
}


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">{body}</svg>\n'


def portrait(name, state):
    suit, cape, accent, skin, hair, mark = CAST[name]
    working = state == "work"
    blocked = state == "blocked"
    body = ['<ellipse cx="60" cy="153" rx="28" ry="4" fill="#050a14" opacity=".4"/>']
    if name in ("batman", "superman", "wonder-woman", "aquaman"):
        body.append(f'<path d="M45 54Q60 47 75 54L92 143H28z" fill="{cape}"/>')
    body.extend([f'<path d="M45 98h13l-1 43H45z M63 98h13l-1 43H63z" fill="{suit}"/>',
                 '<path d="M44 139h14l2 11H40z M63 139h14l4 11H62z" fill="#111725"/>',
                 f'<path d="M43 59q17-10 34 0l3 43H40z" fill="{suit}" stroke="{accent}" stroke-width="1.5"/>',
                 f'<path d="M43 64Q29 74 35 96" fill="none" stroke="{suit}" stroke-width="11" stroke-linecap="round"/>',
                 f'<path d="M77 64Q91 74 85 {52 if working else 96}" fill="none" stroke="{suit}" stroke-width="11" stroke-linecap="round"/>',
                 f'<circle cx="35" cy="96" r="5" fill="{skin}"/><circle cx="85" cy="{52 if working else 96}" r="5" fill="{skin}"/>',
                 f'<path d="M45 97h30v6H45z" fill="{accent}"/>',
                 f'<rect x="56" y="48" width="8" height="11" fill="{skin}"/>',
                 f'<ellipse cx="60" cy="31" rx="16" ry="20" fill="{skin}"/>'])
    if hair in ("cowl", "ears"):
        body.append(f'<path d="M44 30L43 5l10 12q7-5 14 0L77 5l-1 25q-15-10-32 0z" fill="{cape}"/>')
        body.append(f'<path d="M46 30h28v8H46z" fill="{cape}"/>')
    elif hair == "lightning":
        body.append(f'<path d="M44 32Q42 8 60 8q18 0 16 24l-6-7H50z" fill="{suit}"/><path d="M43 31l-8-4 7-3m35 7 8-4-7-3" stroke="{accent}" stroke-width="3" fill="none"/>')
    elif hair == "tiara":
        body.append('<path d="M41 52Q36 10 60 10q24 0 19 42l-8-7V24H49v21z" fill="#171d31"/>')
        body.append(f'<path d="M44 22l16-7 16 7-16 7z" fill="{accent}"/><path d="M60 17l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="#d94b55"/>')
    elif hair == "pigtails":
        body.append('<path d="M43 25q-6-16 17-16t17 16q-17-7-34 0z" fill="#e1d4b5"/><path d="M44 16q-17 10-17 33m49-33q17 10 17 33" stroke="#e1d4b5" stroke-width="7" fill="none"/>')
        body.append('<path d="M26 36l-5 14m73-14 5 14" stroke="#d84e69" stroke-width="6"/>')
    elif hair == "spikes":
        body.append(f'<path d="M43 25l-5-13 10 5 2-13 9 10 7-13 3 14 10-7-4 20q-17-7-32-3z" fill="{cape}"/>')
    elif hair == "cyber":
        body.append('<path d="M60 11q16 0 17 20l-8 14-9-2z" fill="#8b9ba7"/><circle cx="68" cy="33" r="4" fill="#ef5c63"/>')
    elif hair == "long":
        body.append('<path d="M43 21q2-14 17-14t17 14l5 35-10-9V23H48v24l-10 9z" fill="#d4aa62"/>')
    elif hair == "visor":
        body.append('<path d="M44 26q1-17 16-17t16 17q-15-7-32 0z" fill="#1a2325"/><path d="M44 30h32v8H44z" fill="#e8f6e7"/>')
    else:
        body.append('<path d="M44 27q-2-18 16-18t16 18q-8-8-15-8-8 7-17 8z" fill="#111927"/>')
    if hair not in ("visor", "cyber", "cowl", "ears"):
        body.append('<path d="M51 33h5m8 0h5" stroke="#302722" stroke-width="2"/>')
    body.append('<path d="M57 43q3 2 6 0" fill="none" stroke="#754638" stroke-width="1.5"/>')
    symbols = {
        "bat": '<path d="M47 75l5-4 4 2 4-4 4 4 4-2 5 4-8 5H55z"/>',
        "diamond": '<path d="M60 67l12 10-12 10-12-10z"/>',
        "star": '<path d="M60 67l3 7h8l-6 5 2 8-7-4-7 4 2-8-6-5h8z"/>',
        "bolt": '<path d="M62 66l-9 13h7l-2 10 10-16h-8z"/>',
        "ring": '<circle cx="60" cy="77" r="10" fill="none" stroke-width="4"/><path d="M52 77h16" fill="none" stroke-width="3"/>',
        "trident": '<path d="M60 66v22m-8-17q0 9 8 9t8-9m-16 0-3-4m19 4 3-4" fill="none" stroke-width="3"/>',
        "core": '<circle cx="60" cy="77" r="8"/><circle cx="60" cy="77" r="4" fill="#e6ebf2"/>',
        "smile": '<path d="M51 73q9 14 18 0" fill="none" stroke-width="4"/>',
        "cat": '<path d="M51 74q9 9 18 0m-9 0v9" fill="none" stroke-width="3"/>',
    }
    body.append(f'<g fill="{accent}" stroke="{accent}">{symbols[mark]}</g>')
    if name == "aquaman":
        body.append(f'<path d="M92 47v85m-8-83q0 12 8 12t8-12m-8-9v15" fill="none" stroke="{accent}" stroke-width="3"/>')
    if name == "harley-quinn":
        body.append('<path d="M93 58v75" stroke="#9b7550" stroke-width="5"/><rect x="86" y="54" width="14" height="18" rx="2" fill="#d2b591"/>')
    if blocked:
        body.append('<circle cx="99" cy="20" r="11" fill="#e95d6b"/><path d="M99 13v8m0 4v1" stroke="#fff" stroke-width="3"/>')
    return svg(''.join(body))


OUT.mkdir(parents=True, exist_ok=True)
for name in CAST:
    for state in ("rest", "work", "blocked"):
        (OUT / f"{name}-{state}.svg").write_text(portrait(name, state))
    (OUT / f"{name}-fx.svg").write_text(svg('<circle cx="87" cy="57" r="15" fill="none" stroke="#f4c545" stroke-width="2"/><path d="M87 34v8m0 30v8m-23-23h8m30 0h8" stroke="#f4c545" stroke-width="2"/>'))
