#!/usr/bin/env python3
"""The tree view for this layout. Applies the toggle and the attached-session fix to each
layout's own mods, then builds <prefix>-tree from them, so a tree keeps its layout's tiles, avatars
and stats. Safe to run again: run it after changing a layout's spaces or agents mod."""
import json, re
from pathlib import Path
here = Path(__file__).parent
root = here.parent.parent
LAYOUTS = {
  "dc": dict(dir="dc-comics", file="dc-comics", list_w=284, tree_w=312, sector="district", sectors="Districts", op="hero", ops="heroes", Ops="Heroes", wake="wake up", local="LOCAL", remote="REMOTE", other="OTHER HEROES", machine="t.ansi15", head_round="",
    setup="this.castAll([...list, ...flatKids], this.stats, all);", sparg="this.sp, ", word='STATE[status]?.word ?? ""', cls="Operators", extra=["rain.js"]),
}
def sub(text, old, new):
    assert text.count(old) == 1, old[:80]
    return text.replace(old, new)
def fill(text, c):
    return re.sub(r"\{\{(\w+)\}\}", lambda m: str(c[m.group(1)]), text)

for prefix, c in LAYOUTS.items():
    mods = root / "mods"
    # ---- attached sessions stay in the block as one line each ----
    path = mods / f"{prefix}-agents" / "main.js"
    a = path.read_text()
    if "this.allKids = kids;" not in a:
        a = sub(a, "(folded ? [] : kids).map(", "kids.map(")
        a = sub(a, "    if (min[key]) delete min[key];\n    else min[key] = true;\n",
            "    if (min[key]) delete min[key];\n    else min[key] = true;\n    // a parent takes its attached sessions with it; each can still be opened on its own\n"
            "    for (const k of this.allKids?.get(address) ?? []) { if (min[key]) min[this.minKey(k.address)] = true; else delete min[this.minKey(k.address)]; }\n")
        a = sub(a, "    const kids = bgChildren(all);\n", "    const kids = bgChildren(all);\n    this.allKids = kids;\n")
        a, n = re.subn(r"\n\s*\.when\(kids\.length > 0, \(el\) => el\.child\(div\(\)\.flex_none\(\)\.text_size\(10\)\.font_semibold\(\)\.text_color\(alarm \? t\.blocked : t\.dim\)\.child\(`\+\$\{kids\.length\}`\)\)\)", "", a); assert n == 1, prefix
        a = sub(a, '    const alarm = kids.some((k) => k.status === "blocked");\n    return [\n', "    return [\n")
        a = a.replace("a parent folds its attached sessions too", "a parent's attached sessions fold with it, to one line each")
        path.write_text(a)
    # ---- the toggle, in the list header ----
    path = mods / f"{prefix}-spaces" / "main.js"
    s = path.read_text()
    if "TREE_WIDTH" not in s:
        s = sub(s, '''const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
''', f'''const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// Tree view: `tree` (mods/{prefix}-tree) and the two lists are blocks in one column, and this swaps
// them. Which is showing lives in the layout, so it stays per layout and survives restarts.
const TREE_WIDTH = {c["tree_w"]};
const LIST_WIDTH = {c["list_w"]};
const treeOn = () => {{ const node = find(layout(), "tree"); return Boolean(node) && !node.hidden; }};
function showTree(on) {{
  for (const id of ["spaces", "agents"]) run(on ? "layout.hide" : "layout.show", {{ id }});
  run(on ? "layout.show" : "layout.hide", {{ id: "tree" }});
  run("layout.resize", {{ id: "sidebar", px: on ? TREE_WIDTH : LIST_WIDTH }});
}}
''')
        s = sub(s, '''  render() {
    const t = theme();
    const collapsed = narrow();
''', f'''  treeToggle(t) {{
    const on = treeOn();
    return div().id("tree-toggle").size(26).flex_none().flex().items_center().justify_center()
      .bg(on ? t.selected : "#00000000").text_color(on ? t.accent : t.dim).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(on ? "Back to separate {c["sectors"]} and {c["Ops"]} lists" : "Tree view: show each {c["op"]} under its {c["sector"]}")
      .on_click(() => showTree(!on))
      .child(svg("mods/workspace-chrome/layers.svg").size(14));
  }}

  render() {{
    const t = theme();
    const collapsed = narrow();
''')
        s = sub(s, '''        .child(div().id("space-new").size(26).flex_none().flex().items_center().justify_center().rounded(6).hover(s => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => run("space.new")).child(svg("mods/workspace-chrome/plus.svg").size(14))))
''', '''        .child(h_flex().gap(2).items_center()
          .when(!collapsed, el => el.child(this.treeToggle(t)))
          .child(div().id("space-new").size(26).flex_none().flex().items_center().justify_center().rounded(6).hover(s => s.bg(t.hover).text_color(t.foreground))
            .on_click(() => run("space.new")).child(svg("mods/workspace-chrome/plus.svg").size(14)))))
''')
        path.write_text(s)
    # ---- the layout ----
    path = root / "layouts" / f'{c["file"]}.json'
    d = json.loads(path.read_text())
    def walk(n):
        if n.get("id") == "sidebar-lists" and not any(k.get("id") == "tree" for k in n["children"]):
            n["children"].append({"id": "tree", "type": "block", "content": {"mod": f"{prefix}-tree"}, "size": {"weight": 1}, "min": 90, "hidden": True})
        for k in n.get("children", []): walk(k)
    walk(d)
    path.write_text(json.dumps(d, indent=2) + "\n")
    # ---- the tree mod ----
    out = mods / f"{prefix}-tree"
    out.mkdir(exist_ok=True)
    o = (mods / f"{prefix}-agents" / "main.js").read_text()
    o, n = re.subn(r"import \{ View, ", "import { ", o, count=1); assert n == 1
    o = sub(o, f'export default class {c["cls"]} extends View {{', f'export class {c["cls"]} {{')
    # each section and space has its own button, and folds only its own cards
    o = sub(o, 'setShared(MIN, folded ? Object.fromEntries(everyone.map((a) => [this.minKey(a.address), true])) : {});',
        'const min = { ...(shared(MIN) ?? {}) };\n    for (const a of everyone) { if (folded) min[this.minKey(a.address)] = true; else delete min[this.minKey(a.address)]; }\n    setShared(MIN, min);')
    o = sub(o, 'minAllButton(everyone, t) {', 'minAllButton(everyone, t, id) {')
    o, n = re.subn(r'div\(\)\.id\("(op|card)-min-all"\)', r'div().id(`\1-min-all-${id}`)', o); assert n == 1, prefix
    o = sub(o, '.tooltip(allFolded ? "Expand all sessions" : "Minimise all sessions")', '.tooltip(allFolded ? "Expand all sessions here" : "Minimise all sessions here")')
    o = o[:o.index("  render() {\n    const t = theme();\n    const all = terminals();")] + fill((here / "operators_tail.js").read_text(), c)
    (out / "operators.js").write_text(f"// Built by tools/tree/build.py from {prefix}-agents: the same cards, for the tree.\n" + o)
    for f in c["extra"]:
        (out / f).write_text((mods / f"{prefix}-agents" / f).read_text())
    m = (mods / f"{prefix}-spaces" / "main.js").read_text()
    m = f"// The {c['dir']} layout's tree view, built by tools/tree/build.py from {prefix}-spaces and\n// {prefix}-agents: {c['local']} and {c['remote']}, with each {c['op']} nested under its {c['sector']}.\n" + m
    m = sub(m, 'from "herdr";\n', f'from "herdr";\nimport {{ {c["cls"]} as Cards }} from "./operators.js";\n')
    m = sub(m, '    this.git = {}; // where()', '''    this.ops = new Cards();
    this.ops.init?.(_props, cx);   // its own timers and data
    this.spaceFolded = new Set(JSON.parse(localStorage.getItem("spaces.folded") ?? "[]"));
    this.remoteFolded = JSON.parse(localStorage.getItem("sections.remoteFolded") ?? "false");
    this.git = {}; // where()''')
    x = m.index("  // The rows, under a header per machine once one isn't this computer.\n")
    y = m.index("  // Only what's unusual, after the name:")
    m = m[:x] + fill((here / "grouped.js").read_text(), c) + m[y:]
    m = sub(m, '''              .child(g ? this.gitTail(g, tree, w.name, t) : div().flex_1()))
''', '''              .child(g ? this.gitTail(g, tree, w.name, t) : div().flex_1())
              .when(!this.spaceFolded.has(w.id) && this.ops.count(w.id) > 0, (el) => el.child(this.spaceMinAll(w, t)))
              .when(this.ops.count(w.id) > 0, (el) => el.child(this.spaceFold(w, t))))
''')
    m = sub(m, '    if (changed) setShared("space.colors", kept);\n', '    if (changed) setShared("space.colors", kept);\n    this.ops.prepare(sp);\n')
    (out / "main.js").write_text(m)
    (out / "mod.json").write_text('{ "place": "none" }\n')
    print("built", out.name)

