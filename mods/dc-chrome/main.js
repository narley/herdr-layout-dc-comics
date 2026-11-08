// The sidebar header as a comic masthead: the skyline art under a halftone-dot overlay
// and two sweeping searchlight beams, a slanted title with an ink drop shadow, and the
// subtitle in a narration box. With props.footer, the footer (settings, add machine,
// and a shortcut to the next agent that needs you).
import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, window, shared, setShared, updates, layout, agents } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 280) : window()?.platform === "macos" ? 76 : 44 });
}

// HERDR, mostly steady, now and then a glitch.
const INK = "#05070d";
const CREAM = "#f4ecd8";
const TITLE = ["DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "DC HEROES", "GOTHAM", "DC HEROES"];

export default class Chrome extends View {
  init() { this.size = { width: 280, height: 120 }; }

  button(id, icon, action, t) {
    return div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(INK)
      .border(2).border_color(INK).bg(CREAM)
      .hover((s) => s.bg(t.accent))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action)
      .child(svg(`mods/dc-chrome/${icon}.svg`).size(13));
  }

  footer(t, collapsed) {
    const line = (id, prompt, label, color, action) => h_flex().id(id).h(24).px(8).gap(8).items_center().rounded(6)
      .text_color(color).font_semibold().cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.accent)).on_click(action)
      .child(div().flex_none().text_color(t.accent).child(prompt)).when(!collapsed, (el) => el.child(label));
    const waiting = agents().filter((a) => a.status === "blocked" || a.status === "done").length;
    return v_flex().size_full().bg(`${t.chrome}e6`).border_t(1).border_color(t.border).px(6).py(6).gap(1).text_size(12)
      .child(line("settings", "★", "Settings", t.muted, () => run("app.settings"))
        .when(Boolean(updates().app.ready), (el) => el.child(div().text_color(t.accent).child("· update"))))
      .child(line("machine", "★", "Add machine", t.muted, () => run("mod.open", { name: "machine-add" })))
      .child(line("rabbit", "✦", waiting ? `Answer the signal (${waiting})` : "Answer the signal", waiting ? t.foreground : t.dim,
        () => run("agent.next")).tooltip("Jump to the next agent"));
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    if (props()?.footer) return this.footer(t, collapsed);
    const mac = window()?.platform === "macos";
    const fill = (src) => image(src).absolute().top(0).left(0).size_full();
    // the title twice: an ink shadow 2px behind, the yellow face on top, both on the same frames clock
    const title = (color, dx, dy) => div().absolute().left(dx).top(dy).text_size(26).font_bold().italic().text_color(color)
      .whitespace_nowrap().frames(TITLE, 140).child(TITLE[0]);
    return div().id("masthead").relative().size_full().overflow_hidden().bg(t.canvas)
      .child(fill("mods/dc-chrome/gotham-sidebar.svg"))
      .child(fill("mods/dc-chrome/beams.svg").loop("opacity", { from: 0.25, to: 0.9, period: 3600 }))
      .child(fill("mods/dc-chrome/halftone.svg"))
      // a red slab under the title, ink-edged, like a comic logo plate
      .when(!collapsed, (el) => el
        .child(div().absolute().left(10).bottom(30).w(180).h(10).bg(t.solid).border(2).border_color(INK).rounded(2))
        .child(div().absolute().left(14).bottom(34).w(220).h(32)
          .child(title(INK, 2, 2))
          .child(title(t.accent, 0, 0)))
        .child(div().absolute().left(14).bottom(8).px(6).py(1).bg(CREAM).border(2).border_color(INK)
          .text_size(9.5).font_bold().text_color(INK).child("GOTHAM // NIGHT WATCH")))
      .child(h_flex().absolute().top(10).right(10).gap(6)
        .when(!collapsed, (el) => el.child(this.button("search", "search", () => run("mod.open", { name: "picker" }), t)))
        .when(!(collapsed && mac), (el) => el.child(this.button("sidebar-toggle", "sidebar", toggleSidebar, t))));
  }
}
