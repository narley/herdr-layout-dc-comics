// The dc-comics layout's tree view, built by tools/tree/build.py from dc-spaces and
// dc-agents: LOCAL and REMOTE, with each hero nested under its district.
// DISTRICTS (the Matrix layout's spaces): each space is a sector with a flickering code tile
// in its color, its git state as terminal lines. Derived from oompa-spaces / herdr-traveler
// (Apache-2.0, Frank Lin), itself from Herdr's spaces mod.
// Workspace spaces: stable colored avatars, worktrees under their checkout,
// grouped by machine when more than one is known. After a space's name, the repo
// its first terminal is in now, only where unusual: branch, ahead/behind. Agent state lives in the agents list, not here. Click to
// switch, right-click for its menu, drag to reorder.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, machines, panes, run, openOverlay, exec, hc, theme, shared, setShared, watchFolder, window, layout, appHome, readTextFile } from "herdr";
import { Operators as Cards } from "./operators.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// Tree view: `tree` (mods/dc-tree) and the two lists are blocks in one column, and this swaps
// them. Which is showing lives in the layout, so it stays per layout and survives restarts.
const TREE_WIDTH = 312;
const LIST_WIDTH = 284;
const treeOn = () => { const node = find(layout(), "tree"); return Boolean(node) && !node.hidden; };
function showTree(on) {
  for (const id of ["spaces", "agents"]) run(on ? "layout.hide" : "layout.show", { id });
  run(on ? "layout.show" : "layout.hide", { id: "tree" });
  run("layout.resize", { id: "sidebar", px: on ? TREE_WIDTH : LIST_WIDTH });
}

// Where a space is now: its first terminal's live folder, else where it was made.
// `ps`: panes(), read once by the caller (each read copies every pane).
function place(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}
// Every folder a space has a terminal in: its tabs are often different projects.
function keysOf(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  const dirs = new Set(ps.filter((p) => tabs.has(p.tab) && p.cwd).map((p) => p.cwd));
  if (!dirs.size && s.folder) dirs.add(s.folder);
  return [...dirs].map((d) => JSON.stringify([s.machine ?? null, d]));
}
const rowHeight = ({ tree }) => (tree ? 26 : 52);
const CODE = "★✦◆◇◈▣▤▥0123456789";
const where = (s, ps) => JSON.stringify([s.machine ?? null, place(s, ps)]);
const base = (path) => path.replace(/\/+$/, "").split("/").pop();
// Changes made outside Herdr (an editor's save, a commit in another app): looked
// for this often, in repos the list shows, while the window is in front.
const FALLBACK = 60000;

// What a stored color name looks like on an avatar (the same in every mod
// that draws space avatars): one strong color per hue, light and dark alike.

// A space speaks up only when something in it needs you.
export function glyph(status) {
  return status === "blocked" || status === "done" ? "●" : "·";
}

export function tone(t, status) {
  return t[status] ?? t.unknown;
}

export default class Spaces extends View {
  init(_props, cx) {
    this.ops = new Cards();
    this.ops.init?.(_props, cx);   // its own timers and data
    this.spaceFolded = new Set(JSON.parse(localStorage.getItem("spaces.folded") ?? "[]"));
    this.remoteFolded = JSON.parse(localStorage.getItem("sections.remoteFolded") ?? "false");
    this.git = {}; // where() -> { name, branch, ahead, behind, repo, linked }, null: not a repo
    this.checked = {}; // where() -> when it was last looked at
    this.unsure = new Set(); // where()s git couldn't answer for (a machine away)
    this.pending = new Set(); // where()s to look at next
    this.busy = {}; // pane -> an agent working or a program in front of its shell
    this.ready = {}; // machine -> its layout was readable at the last look
    this.at = {}; // space -> its where() at the last look
    this.watching = new Set(); // local repos' git folders
    // Spaces made while this runs wait (at most a moment) for their git, so a
    // worktree appears under its repo instead of jumping there.
    this.shown = new Set(spaces().map((s) => s.id));
    this.born = {};
    this.pressed = null;
    this.over = null;
    this.machines = [];
    this.folded = new Set(JSON.parse(localStorage.getItem("machines.folded") ?? "[]"));
    this.refreshMachines(cx);
    cx.timer.every(15000, cx => this.refreshMachines(cx));
    // `git status` walks the whole tree, on another machine a process there:
    // only when its answer could have changed (see `due`).
    cx.timer.every(250, (cx) => this.checkNew(cx));
  }

  checkNew(cx) {
    const now = Date.now();
    const sp = spaces();
    for (const s of sp) if (!this.shown.has(s.id)) this.born[s.id] ??= now;
    const due = this.due(now, sp, panes());
    if (due.size) this.refreshGit(due, cx);
    if (sp.some((s) => !this.shown.has(s.id))) cx.notify();
  }

  // Places whose git could have changed: new ones (a new space, a cd), where a
  // command or an agent's turn just ended (a checkout, a commit, edits), those on
  // a machine that is back, and repos in view whose fallback is due.
  due(now, sp, ps) {
    // Moved there: what it knew of that place may be old.
    const at = {};
    for (const s of sp) at[s.id] = where(s, ps);
    const keys = new Set(Object.values(at).filter((k) => JSON.parse(k)[1]));
    for (const s of sp) for (const k of keysOf(s, ps)) keys.add(k);
    const due = new Set([...keys].filter((k) => !(k in this.git)));
    for (const [id, k] of Object.entries(at)) if (this.at[id] && this.at[id] !== k && keys.has(k)) due.add(k);
    this.at = at;
    const spaceOf = {};
    for (const s of sp) for (const t of s.tabs ?? []) spaceOf[t.id] = s;
    const busy = {};
    for (const p of ps) {
      if (!p.terminal || !spaceOf[p.tab]) continue;
      busy[p.pane] = p.status === "working" || !(p.program?.shell || p.program?.agent);
      if (this.busy[p.pane] && !busy[p.pane]) {
        this.sameRepo(at[spaceOf[p.tab].id], keys).forEach((k) => due.add(k));
        if (p.cwd) this.sameRepo(JSON.stringify([spaceOf[p.tab].machine ?? null, p.cwd]), keys).forEach((k) => due.add(k));
      }
    }
    this.busy = busy;
    for (const m of machines()) {
      const ready = m.layout === "ready";
      if (ready && this.ready[m.name] === false) for (const k of keys) if (JSON.parse(k)[0] === m.name) due.add(k);
      this.ready[m.name] = ready;
    }
    if (window().active) {
      for (const k of keys) {
        const asks = this.git[k] || this.unsure.has(k);
        if (asks && !this.folded.has(JSON.parse(k)[0]) && now - (this.checked[k] ?? 0) > FALLBACK) due.add(k);
      }
    }
    return due;
  }

  // `key` and the other places in its repo (a commit there moves their ahead/behind).
  sameRepo(key, keys) {
    const repo = this.git[key]?.repo;
    return [key, ...(repo ? [...keys].filter((k) => this.git[k]?.repo === repo) : [])];
  }

  refreshMachines(cx) {
    cx.spawn(async cx => {
      try { const r = await hc(["machine", "ls", "--json"]); if (r.code === 0) this.machines = (JSON.parse(r.stdout).machines ?? []).filter((m) => !m.temporary); } catch {}
      cx.notify();
    });
  }

  // One look at a time, each place once however often it was asked for meanwhile.
  refreshGit(keys, cx) {
    for (const k of keys) this.pending.add(k);
    if (this.refreshing) return;
    this.refreshing = true;
    cx.spawn(async (cx) => {
      while (this.pending.size) {
        const keys = [...this.pending];
        this.pending.clear();
        for (const key of keys) await this.check(key, cx);
      }
      const used = new Set(Object.values(this.git).filter(Boolean).map((g) => JSON.parse(g.repo)).filter(([on]) => !on).map(([, repo]) => repo));
      for (const repo of this.watching) if (!used.has(repo)) this.watching.delete(repo);
      this.refreshing = false;
      cx.notify();
    });
  }

  // One place's git: branch, ahead/behind, its repo.
  async check(key, cx) {
    const [on, cwd] = JSON.parse(key);
    this.checked[key] = Date.now();
    this.unsure.delete(key);
    try {
      // No optional locks: a status that touched the index would wake the watch again.
      // Writes nothing under .git (index lock, fsmonitor cookie): watch() would wake on it.
      const r = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "safe.bareRepository=explicit", "status", "--porcelain=v2", "--branch"], { cwd, on });
      if (r.code !== 0) {
        // Only git's own "no" is remembered as no repo; anything else is asked again.
        if (!/not a git repository/i.test(r.stderr)) this.unsure.add(key);
        this.git[key] = null;
        return;
      }
      // The repo's own .git folder names it; a worktree's top differs from it.
      const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
      const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, on });
      const repo = common.stdout.trim();
      const name = repo.endsWith("/.git") ? base(repo.slice(0, -5)) : base(repo).replace(/\.git$/, "");
      const info = { name, branch: null, ahead: 0, behind: 0, dirty: 0, upstream: false, top: top.stdout.trim(), repo: JSON.stringify([on, repo]), linked: repo !== `${top.stdout.trim()}/.git` };
      for (const line of r.stdout.split("\n")) {
        if (line && !line.startsWith("# ")) info.dirty++;
        else if (line.startsWith("# branch.upstream ")) info.upstream = true;
        else if (line.startsWith("# branch.head ")) info.branch = line.slice(14);
        else if (line.startsWith("# branch.ab ")) {
          const [a, b] = line.slice(12).split(" ");
          info.ahead = Math.abs(parseInt(a, 10)) || 0;
          info.behind = Math.abs(parseInt(b, 10)) || 0;
        }
      }
      this.git[key] = info;
      if (!on) this.watch(repo, cx);
    } catch {
      // Couldn't ask (the machine is away): keep what it showed, look again later.
      this.git[key] ??= null;
      this.unsure.add(key);
    }
  }

  watch(repo, cx) {
    if (this.watching.has(repo)) return;
    this.watching.add(repo);
    cx.spawn(async (cx) => {
      try {
        while (this.watching.has(repo)) {
          await watchFolder(repo);
          const mine = JSON.stringify([null, repo]);
          if (this.watching.has(repo)) this.refreshGit(Object.keys(this.git).filter((k) => this.git[k]?.repo === mine), cx);
        }
      } catch { this.watching.delete(repo); }
    });
  }

  menu(w) {
    // A popup is as tall as its items; height is only the most.
    openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: w.id } } });
  }

  // Spaces in order, each worktree space moved under its main checkout's.
  ordered() {
    const sp = spaces(), ps = panes();
    const ready = (w) => this.shown.has(w.id) || where(w, ps) in this.git || Date.now() - (this.born[w.id] ??= Date.now()) > 1500;
    for (const w of sp) if (!this.shown.has(w.id) && ready(w)) this.shown.add(w.id);
    const list = sp.map((w, i) => ({ w, i, g: this.git[where(w, ps)] ?? null, sum: this.sum(w, ps) })).filter((r) => this.shown.has(r.w.id));
    const mains = new Set(list.filter((r) => r.g && !r.g.linked).map((r) => r.g.repo));
    const nested = (r) => r.g?.linked && mains.has(r.g.repo);
    const out = [];
    const placed = new Set(); // repos whose worktrees are listed (under the first of its spaces)
    for (const r of list) {
      if (nested(r)) continue;
      out.push({ ...r, tree: null });
      if (!r.g || r.g.linked || placed.has(r.g.repo)) continue;
      placed.add(r.g.repo);
      const kids = list.filter((k) => nested(k) && k.g.repo === r.g.repo);
      kids.forEach((k, n) => out.push({ ...k, tree: n === kids.length - 1 ? "└─" : "├─" }));
    }
    return out;
  }

  toggleSpace(id, cx) {
    this.spaceFolded.has(id) ? this.spaceFolded.delete(id) : this.spaceFolded.add(id);
    localStorage.setItem("spaces.folded", JSON.stringify([...this.spaceFolded]));
    cx.notify();
  }

  // LOCAL or REMOTE, drawn like the list header. Folded, it still says what's waiting inside.
  sectionHead(id, label, icon, folded, ids, onToggle, plus, t) {
    const O = this.ops;
    const waiting = O.waiting(ids);
    const members = ids.flatMap((x) => O.members(x));
    return h_flex().id(`section-${id}`).h(28).flex_none().mt(id === "local" ? 0 : 8).mb(4).px(8).gap(7).items_center()
      .bg(`${t.chrome}e6`).border_t(1).border_b(1).border_color(t.border).text_size(11.5).font_semibold().text_color(t.accent)
      .cursor_pointer().hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => onToggle(cx))
      .child(svg(`mods/workspace-chrome/${icon}.svg`).size(13).flex_none())
      .child(div().flex_1().min_w(0).truncate().child(label))
      .when(folded && waiting > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.blocked).child(`${waiting} wake up`)))
      .when(!folded && members.length > 0, (el) => el.child(O.minAllButton(members, t, id)))
      .when(Boolean(plus), (el) => el.child(plus))
      .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none());
  }

  // A machine's rows: each district with its heroes nested below it.
  spaceRows(rows, machine, known, t) {
    const O = this.ops;
    const nest = (children, tree) => v_flex().flex_none().ml(tree ? 24 : 12).pl(4).gap(5).mt(3).mb(5).border_l(1).border_color(t.border).children(children);
    const out = rows.flatMap((r) => {
      const kids = this.spaceFolded.has(r.w.id) ? [] : O.rowsFor(r.w.id, t);
      return [this.row(r, t), ...(kids.length ? [nest(kids, r.tree)] : [])];
    });
    // Nothing goes missing: a hero in a district not on the list still shows.
    const stray = O.elsewhere(known, machine).flatMap((id) => O.rowsFor(id, t));
    if (stray.length) {
      out.push(div().h(24).flex_none().px(8).flex().items_center().text_size(11).text_color(t.dim).child("OTHER HEROES"));
      out.push(nest(stray, null));
    }
    return out;
  }

  plusButton(m, t) {
    return div().id(`machine-add-${m ?? "local"}`).flex_none().px(4).text_size(13).hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(`New district on ${m ?? "this computer"}`)
      .on_click((_e, cx) => { cx.stop_propagation(); run("space.new", m ? { machine: m } : {}); }).child("+");
  }

  // LOCAL, then REMOTE with one line per machine under it.
  grouped(t, collapsed) {
    const rows = this.ordered();
    if (collapsed) return rows.map((r) => this.compact(r, t));
    const O = this.ops;
    const known = new Set(rows.map((r) => r.w.id));
    const remote = [...new Set([...rows.map((r) => r.w.machine).filter(Boolean), ...this.machines.map((m) => m.name)])].sort();
    const loading = (m) => {
      const layout = machines().find((k) => k.name === m)?.layout;
      return layout === "loading" || (!layout && this.machines.some((k) => k.name === m && k.state === "connected"))
        || spaces().some((s) => (s.machine ?? null) === m && !this.shown.has(s.id));
    };
    const idsOn = (m) => [...rows.filter((r) => (r.w.machine ?? null) === m).map((r) => r.w.id), ...O.elsewhere(known, m)];
    const body = (m) => {
      const mine = rows.filter((r) => (r.w.machine ?? null) === m);
      const drawn = this.spaceRows(mine, m, known, t);
      if (drawn.length) return drawn;
      if (loading(m)) return [div().id(`machine-loading-${m ?? "local"}`).h(28).flex_none().px(8).text_size(12).text_color(t.dim).child("Loading…")];
      return [h_flex().id(`machine-new-${m ?? "local"}`).h(28).flex_none().px(8).gap(7).items_center().text_size(12).text_color(t.dim).hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => run("space.new", m ? { machine: m } : {})).child(svg("mods/workspace-chrome/plus.svg").size(12)).child("New district")];
    };

    const toggleLocal = (cx) => {
      this.folded.has(null) ? this.folded.delete(null) : this.folded.add(null);
      localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
      cx.notify();
    };
    const out = [
      this.sectionHead("local", "LOCAL", "monitor", this.folded.has(null), idsOn(null), toggleLocal, this.plusButton(null, t), t),
      ...(this.folded.has(null) ? [] : body(null)),
    ];
    if (!remote.length) return out;

    const toggleRemote = (cx) => {
      this.remoteFolded = !this.remoteFolded;
      localStorage.setItem("sections.remoteFolded", JSON.stringify(this.remoteFolded));
      cx.notify();
    };
    out.push(this.sectionHead("remote", "REMOTE", "server", this.remoteFolded, remote.flatMap(idsOn), toggleRemote, null, t));
    if (this.remoteFolded) return out;

    for (const m of remote) {
      const machine = this.machines.find((k) => k.name === m);
      const connected = machine?.state === "connected";
      const folded = this.folded.has(m);
      out.push(h_flex().id(`machine-${m}`).h(26).flex_none().px(8).gap(7).items_center().text_size(13).text_color(t.dim)
        .cursor_pointer().hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => {
          folded ? this.folded.delete(m) : this.folded.add(m);
          localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
          cx.notify();
        })
        .child(div().size(8).rounded(4).flex_none().bg(connected ? t.ansi2 : t.dim))
        .child(div().flex_1().truncate().text_color(t.ansi15).child(m))
        .when(folded && O.waiting(idsOn(m)) > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.blocked).child(`${O.waiting(idsOn(m))} wake up`)))
        .when(!connected, (el) => el.child(div().flex_none().text_size(11).child((machine?.state ?? "asleep").replace(/_/g, " "))))
        .when(connected, (el) => el.child(this.plusButton(m, t)))
        .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none()));
      if (!folded) out.push(...body(m));
    }
    return out;
  }

  // Minimises every card in this district. A press on a row switches district, so these stop their own.
  spaceMinAll(w, t) {
    const stop = (_e, cx) => cx.stop_propagation();
    return div().id(`space-min-all-${w.id}`).flex_none().on_mouse_down("left", stop).on_mouse_up("left", stop)
      .child(this.ops.minAllButton(this.ops.members(w.id), t, w.id));
  }

  spaceFold(w, t) {
    const O = this.ops;
    const folded = this.spaceFolded.has(w.id);
    const stop = (_e, cx) => cx.stop_propagation();
    const top = folded ? O.topStatus(w.id) : null;
    return h_flex().id(`space-fold-${w.id}`).h(20).flex_none().px(3).gap(4).items_center().text_size(10).text_color(t.dim)
      .cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(folded ? "Show this district's heroes" : "Hide this district's heroes")
      .on_mouse_down("left", stop).on_mouse_up("left", stop)
      .on_click((_e, cx) => { cx.stop_propagation(); this.toggleSpace(w.id, cx); })
      .when(folded, (el) => el.child(div().font_semibold().text_color(t[top] ?? t.dim).child(`${O.word(top)} [${O.count(w.id)}]`)))
      .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none());
  }

  // Only what's unusual, after the name: "herdr \u00b7 spike \u21912 \u21931". The repo or
  // branch goes when the name already says it (a worktree is named after its branch),
  // and master/main go: nearly every space is on one.
  gitTail(g, tree, name, t) {
    const raw = g.branch ?? "detached";
    const same = (a) => a.toLowerCase() === name.toLowerCase();
    const branch = same(raw) || raw === "master" || raw === "main" ? "" : raw;
    const repo = tree || same(g.name) ? "" : g.name;
    const where = [repo, branch].filter(Boolean).join(" \u00b7 ");
    return h_flex()
      .flex_1()
      .min_w(0)
      .gap(5)
      .justify_end()
      .items_center()
      .text_size(11.5)
      .text_color(t.dim)
      .when(Boolean(where), (el) => el.child(div().min_w(0).truncate().child(where)))
      .when(g.ahead > 0, (el) => el.child(div().flex_none().text_color(t.ansi2).child(`\u2191${g.ahead}`)))
      .when(g.behind > 0, (el) => el.child(div().flex_none().text_color(t.ansi1).child(`\u2193${g.behind}`)));
  }

  // A space's git added up over its folders; a repo seen from two folders counts once.
  sum(w, ps) {
    const repos = new Map();
    for (const k of keysOf(w, ps)) if (this.git[k]) repos.set(JSON.stringify([w.machine ?? null, this.git[k].top]), this.git[k]);
    const all = [...repos.values()];
    return {
      dirty: all.reduce((n, g) => n + g.dirty, 0),
      ahead: all.reduce((n, g) => n + g.ahead, 0),
      local: all.filter((g) => !g.upstream && g.branch !== "(detached)").length,
    };
  }

  gitLines(sum, t) {
    const line = (color, text) => div().truncate().text_size(11.5).text_color(color).child(text);
    return [
      sum.dirty > 0 && line(t.ansi3, `${sum.dirty} uncommitted file${sum.dirty === 1 ? "" : "s"}`),
      sum.ahead > 0 && line(t.ansi2, `${sum.ahead} unpushed commit${sum.ahead === 1 ? "" : "s"}`),
      sum.local > 0 && line(t.ansi1, `${sum.local} repo${sum.local === 1 ? "" : "s"} without a remote`),
    ].filter(Boolean);
  }

  row({ w, i, g, sum, tree }, t) {
    const on = w.active;
    return v_flex()
      .relative()
      .id(`space-${w.id}`)
      .px(8)
      .h(rowHeight({ tree }))
      .flex_none()
      .justify_center()
      .border_l(2).border_color(on ? t.accent : "#00000000")
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((s) => s.bg(t.hover)))
      .when(this.pressed === i && this.over !== i, (el) => el.opacity(0.5))
      .when(this.pressed !== null && this.over === i && this.pressed !== i, (el) => el.child(
        div().absolute().left(0).right(0).h(2).bg(t.accent)
          .when(this.pressed < i, line => line.bottom(0))
          .when(this.pressed > i, line => line.top(0)),
      ))
      .on_mouse_down("left", () => {
        this.pressed = i;
        this.over = i;
      })
      .on_mouse_move((_e, cx) => {
        const source = spaces()[this.pressed];
        const over = source && (source.machine ?? null) === (w.machine ?? null) ? i : null;
        if (this.pressed !== null && this.over !== over) {
          this.over = over;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed;
        const over = this.over;
        this.pressed = null;
        this.over = null;
        if (from !== null && over === i && from !== i) run("space.move", { id: spaces()[from].id, index: i + 1 });
        else if (from === i) run("space.select", { id: w.id });
        cx.notify();
      })
      .on_mouse_down("right", () => this.menu(w))
      .child(
        h_flex()
          .gap(9)
          .items_center()
          .when(Boolean(tree), el => el.pl(22).child(svg("mods/workspace-chrome/branch.svg").size(13).text_color(t.dim)))
          .when(!tree, el => el.child(this.tile(w, i, t)))
          .child(v_flex().flex_1().min_w(0).gap(1)
            .child(h_flex().gap(9).items_center()
              .child(div().flex_shrink(0).max_w(150).truncate().text_color(t.foreground).child(w.name))
              .child(g ? this.gitTail(g, tree, w.name, t) : div().flex_1())
              .when(!this.spaceFolded.has(w.id) && this.ops.count(w.id) > 0, (el) => el.child(this.spaceMinAll(w, t)))
              .when(this.ops.count(w.id) > 0, (el) => el.child(this.spaceFold(w, t))))
            .when(!tree, el => el.children(this.gitLines(sum, t)))),
      );
  }

  // A sector tile: a code glyph in the space's color over its number; a busy sector's glyph churns.
  tile(w, i, t) {
    const color = t[(shared("space.colors") ?? {})[w.id]] ?? t.accent;
    let h = 0;
    for (const c of w.id) h = (h * 31 + c.codePointAt(0)) >>> 0;
    const glyphs = Array.from({ length: 6 }, (_, k) => CODE[(h >>> (k * 3)) % CODE.length]);
    const busy = w.status === "working";
    return v_flex().w(38).h(38).flex_none().items_center().justify_center().border(1).border_color(`${color}88`).bg(`${color}14`)
      .child(div().text_size(15).line_height("17px").font_semibold().text_color(color).child(glyphs[0]).frames(glyphs, busy ? 120 : 1600))
      .child(div().text_size(9).line_height("10px").text_color(t.dim).child(String(i + 1).padStart(2, "0")));
  }

  compact({ w, i }, t) {
    return h_flex()
      .id(`space-${w.id}`)
      .h(26)
      .flex_none()
      .justify_center()
      .gap(4)
      .when(w.active, (el) => el.bg(t.raised))
      .hover((s) => s.bg(t.hover))
      .on_click(() => run("space.select", { id: w.id }))
      .child(div().text_color(w.active ? t.foreground : t.muted).child(String(i + 1)))
      .child(div().text_color(tone(t, w.status)).child(glyph(w.status)));
  }

  treeToggle(t) {
    const on = treeOn();
    return div().id("tree-toggle").size(26).flex_none().flex().items_center().justify_center()
      .bg(on ? t.selected : "#00000000").text_color(on ? t.accent : t.dim).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(on ? "Back to separate Districts and Heroes lists" : "Tree view: show each hero under its district")
      .on_click(() => showTree(!on))
      .child(svg("mods/workspace-chrome/layers.svg").size(14));
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    const palette = ["ansi6", "ansi3", "ansi4", "ansi5", "ansi2", "ansi1"];
    const sp = spaces();
    const ids = new Set(sp.map(p => p.id));
    const kept = Object.fromEntries(Object.entries(shared("space.colors") ?? {}).filter(([id]) => ids.has(id)));
    let changed = Object.keys(kept).length !== Object.keys(shared("space.colors") ?? {}).length;
    for (const p of sp) {
      if (kept[p.id] || p.name === "~") continue;
      const uses = c => Object.values(kept).filter(v => v === c).length;
      kept[p.id] = palette.reduce((best, c) => uses(c) < uses(best) ? c : best);
      changed = true;
    }
    if (changed) setShared("space.colors", kept);
    this.ops.prepare(sp);
    return v_flex().size_full().min_h(0).text_size(13)
      .child(h_flex().h(31).pl(16).pr(10).items_center().justify_between().text_size(11.5).text_color(t.dim)
        .when(!collapsed, el => el.child(div().font_semibold().text_color(t.accent).child("DISTRICTS")))
        .child(h_flex().gap(2).items_center()
          .when(!collapsed, el => el.child(this.treeToggle(t)))
          .child(div().id("space-new").size(26).flex_none().flex().items_center().justify_center().rounded(6).hover(s => s.bg(t.hover).text_color(t.foreground))
            .on_click(() => run("space.new")).child(svg("mods/workspace-chrome/plus.svg").size(14)))))
      .child(v_flex().flex_1().min_h(0).px(8).pb(14).overflow_y_scrollbar().mode("always")
        .on_mouse_up("left", (_e, cx) => { this.pressed = null; cx.notify(); })
        .children(this.grouped(t, collapsed)));
  }
}
