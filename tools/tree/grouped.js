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
      {{head_round}}.bg(`${t.chrome}e6`).border_t(1).border_b(1).border_color(t.border).text_size(11.5).font_semibold().text_color(t.accent)
      .cursor_pointer().hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => onToggle(cx))
      .child(svg(`mods/workspace-chrome/${icon}.svg`).size(13).flex_none())
      .child(div().flex_1().min_w(0).truncate().child(label))
      .when(folded && waiting > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.blocked).child(`${waiting} {{wake}}`)))
      .when(!folded && members.length > 0, (el) => el.child(O.minAllButton(members, t, id)))
      .when(Boolean(plus), (el) => el.child(plus))
      .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none());
  }

  // A machine's rows: each {{sector}} with its {{ops}} nested below it.
  spaceRows(rows, machine, known, t) {
    const O = this.ops;
    const nest = (children, tree) => v_flex().flex_none().ml(tree ? 24 : 12).pl(4).gap(5).mt(3).mb(5).border_l(1).border_color(t.border).children(children);
    const out = rows.flatMap((r) => {
      const kids = this.spaceFolded.has(r.w.id) ? [] : O.rowsFor(r.w.id, t);
      return [this.row(r, t), ...(kids.length ? [nest(kids, r.tree)] : [])];
    });
    // Nothing goes missing: a {{op}} in a {{sector}} not on the list still shows.
    const stray = O.elsewhere(known, machine).flatMap((id) => O.rowsFor(id, t));
    if (stray.length) {
      out.push(div().h(24).flex_none().px(8).flex().items_center().text_size(11).text_color(t.dim).child("{{other}}"));
      out.push(nest(stray, null));
    }
    return out;
  }

  plusButton(m, t) {
    return div().id(`machine-add-${m ?? "local"}`).flex_none().px(4).text_size(13).hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(`New {{sector}} on ${m ?? "this computer"}`)
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
        .on_click(() => run("space.new", m ? { machine: m } : {})).child(svg("mods/workspace-chrome/plus.svg").size(12)).child("New {{sector}}")];
    };

    const toggleLocal = (cx) => {
      this.folded.has(null) ? this.folded.delete(null) : this.folded.add(null);
      localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
      cx.notify();
    };
    const out = [
      this.sectionHead("local", "{{local}}", "monitor", this.folded.has(null), idsOn(null), toggleLocal, this.plusButton(null, t), t),
      ...(this.folded.has(null) ? [] : body(null)),
    ];
    if (!remote.length) return out;

    const toggleRemote = (cx) => {
      this.remoteFolded = !this.remoteFolded;
      localStorage.setItem("sections.remoteFolded", JSON.stringify(this.remoteFolded));
      cx.notify();
    };
    out.push(this.sectionHead("remote", "{{remote}}", "server", this.remoteFolded, remote.flatMap(idsOn), toggleRemote, null, t));
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
        .child(div().flex_1().truncate().text_color({{machine}}).child(m))
        .when(folded && O.waiting(idsOn(m)) > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.blocked).child(`${O.waiting(idsOn(m))} {{wake}}`)))
        .when(!connected, (el) => el.child(div().flex_none().text_size(11).child((machine?.state ?? "asleep").replace(/_/g, " "))))
        .when(connected, (el) => el.child(this.plusButton(m, t)))
        .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none()));
      if (!folded) out.push(...body(m));
    }
    return out;
  }

  // Minimises every card in this {{sector}}. A press on a row switches {{sector}}, so these stop their own.
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
      .tooltip(folded ? "Show this {{sector}}'s {{ops}}" : "Hide this {{sector}}'s {{ops}}")
      .on_mouse_down("left", stop).on_mouse_up("left", stop)
      .on_click((_e, cx) => { cx.stop_propagation(); this.toggleSpace(w.id, cx); })
      .when(folded, (el) => el.child(div().font_semibold().text_color(t[top] ?? t.dim).child(`${O.word(top)} [${O.count(w.id)}]`)))
      .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none());
  }

