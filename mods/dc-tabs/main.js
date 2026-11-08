// The DC layout's tab bar, comic style: each tab is an ink-outlined panel with a red
// issue badge ("#1"), the shown tab in yellow, a sound-effect chip while an agent works
// (ZAP! POW! BAM!), a red ! when one needs you, a star when one finished. Files and
// Changes open the side panel, remembered per space as Herdr's tabs do.
// Derived from matrix-tabs / herdr-traveler's traveler-tabs (Apache-2.0, Frank Lin).
import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, shared, layout, settings } from "herdr";

const SFX = ["ZAP!", "POW!", "BAM!", "WHAM!"];
const INK = "#05070d";
const CREAM = "#f4ecd8";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs extends View {
  init() {
    this.pressed = null;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
  }

  // The side panel is remembered per space (as the shipped tabs mod does).
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const space = spaces().find((p) => p.active);
    const shown = space?.tabs ?? [];
    const ps = panes();
    const stop = (_e, cx) => cx.stop_propagation();
    const item = (c, i) => {
      const program = ps.find((p) => p.tab === c.id && p.program?.agent)?.program ?? ps.find((p) => p.tab === c.id)?.program;
      const name = c.named ? c.name : space?.name && shown.length === 1 ? space.name : program?.name ?? `Tab ${c.index}`;
      const on = c.active;
      const chip = (text, bg, fg) => div().flex_none().px(4).h(15).flex().items_center().rounded(3).border(1.5).border_color(INK)
        .bg(bg).text_size(8.5).font_bold().text_color(fg).child(text);
      return h_flex().id(`tab-${c.id}`).h(28).px(8).gap(6).items_center().flex_none().text_size(11.5).rounded(6)
        .border(2).border_color(INK).bg(on ? t.accent : t.surface)
        .text_color(on ? INK : t.muted).hover((s) => s.bg(on ? t.accent : t.raised).text_color(on ? INK : t.foreground))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: c.index });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .child(div().flex_none().px(4).h(16).flex().items_center().rounded(8).bg(t.solid).border(1.5).border_color(INK)
          .text_size(9).font_bold().text_color("#fff6e6").child(`#${c.index}`))
        .child(div().max_w(180).truncate().font_bold().child((c.zoomed ? `${name} (zoomed)` : name).toUpperCase()))
        .when(c.status === "working", (el) => el.child(chip(SFX[0], t.working, "#ffffff").frames(SFX, 650)))
        .when(c.status === "blocked", (el) => el.child(chip("!", t.blocked, "#ffffff").loop("opacity", { from: 0.35, to: 1, period: 700 })))
        .when(c.status === "done", (el) => el.child(chip("★", t.done, INK)))
        .when(on, (el) => el.child(div().id(`close-${c.id}`).text_size(13).font_bold().text_color(INK).hover((s) => s.text_color(t.solid))
          .on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }).child("×")));
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const bracket = (id, label, on, action) => div().id(id).h(26).px(9).flex_none().flex().items_center().rounded(6).text_size(11).font_bold()
      .border(2).border_color(INK).bg(on ? t.accent : CREAM).text_color(INK)
      .hover((s) => s.bg(t.accent)).on_mouse_down("left", stop).on_click(action).child(label);
    const panelButton = (id) => {
      const on = panel && !panel.hidden && body?.active === id;
      return bracket(`panel-${id}`, id === "files" ? "Files" : "Changes", on, () => {
        if (on) run("layout.hide", { id: "panel" });
        else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
      });
    };
    return h_flex().size_full().min_w(0).pr(10).pl(lightsPadding).gap(6).items_center().bg(t.chrome).border_b(2).border_color(INK)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel((e) => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(div().flex_none().px(6).h(18).flex().items_center().rounded(3).bg(t.solid).border(2).border_color(INK)
        .text_size(9.5).font_bold().text_color("#fff6e6").child((space?.machine ?? "local").toUpperCase()))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(5).overflow_x_scrollbar().children(shown.map(item)))
      .child(bracket("tab-new", "+", false, () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })))
      .when(enabled.includes("files"), (el) => el.child(panelButton("files")))
      .when(enabled.includes("changes"), (el) => el.child(panelButton("changes")))
      .when(w?.buttons, (el) => el.child(bracket("minimize", "_", false, () => run("window.minimize")))
        .child(bracket("maximize", "□", false, () => run("window.maximize")))
        .child(bracket("close-window", "×", false, () => run("window.close"))));
  }
}
