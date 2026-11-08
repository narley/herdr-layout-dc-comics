  // Everything one render needs, read once: each host read copies the whole list into JS.
  prepare(sp) {
    const all = terminals();
    this.kids = bgChildren(all);
    this.allKids = this.kids;
    const flatKids = [...this.kids.values()].flat();
    const nestedAt = new Set(flatKids.map((k) => k.address));
    const list = agents().filter((a) => !nestedAt.has(a.address));
    const paneList = panes();
    this.focusedTerm = paneList.find((p) => p.focused)?.terminal ?? null;
    this.stats = claudeStats(all, list);
    for (const k of flatKids) this.stats.set(k.address, k.stats);
    this.sp = sp;
    {{setup}}

    // Which sector each operator sits in: by its tab, which says so on any machine.
    const spaceOfTab = new Map(sp.flatMap((s) => (s.tabs ?? []).map((tab) => [tab.id, s.id])));
    this.bySpace = new Map();
    const entry = (id) => {
      if (!this.bySpace.has(id)) this.bySpace.set(id, { parents: [], orphans: [] });
      return this.bySpace.get(id);
    };
    for (const a of list) entry(spaceOfTab.get(a.tab) ?? a.space ?? null).parents.push(a);
    // An attached session whose parent has gone still has a pane, so it stays in its sector.
    const parents = new Set(list.map((a) => a.address));
    const tabOf = new Map(paneList.filter((p) => p.terminal).map((p) => [p.terminal, p.tab]));
    for (const [parent, kids] of this.kids) {
      if (parents.has(parent)) continue;
      for (const k of kids) entry(spaceOfTab.get(tabOf.get(k.address)) ?? null).orphans.push(k);
    }
    setAgentOrder([...sp.map((s) => s.id), null].flatMap((id) => this.bySpace.get(id)?.parents ?? []).map((a) => a.address));
  }

  // Everyone in one sector, attached sessions included.
  members(id) {
    const e = this.bySpace.get(id);
    if (!e) return [];
    return [...e.parents, ...e.parents.flatMap((a) => this.kids.get(a.address) ?? []), ...e.orphans];
  }

  count(id) {
    return this.members(id).length;
  }

  // The most urgent state in a sector, for its folded row.
  topStatus(id) {
    const rank = { blocked: 4, done: 3, working: 2, idle: 1 };
    return this.members(id).reduce((top, a) => ((rank[a.status] ?? 0) > (rank[top] ?? 0) ? a.status : top), null);
  }

  // The same words the cards use.
  word(status) {
    return {{word}};
  }

  waiting(ids) {
    return ids.flatMap((id) => this.members(id)).filter((a) => a.status === "blocked" || a.status === "done").length;
  }

  // Sectors with operators the tree isn't drawing, on this machine (null: this computer).
  elsewhere(known, machine) {
    const mine = (a) => (a.address.includes("/") ? a.address.split("/")[0] : null) === machine;
    return [...this.bySpace.keys()].filter((id) => !known.has(id) && this.members(id).some(mine));
  }

  rowsFor(id, t) {
    const e = this.bySpace.get(id);
    if (!e) return [];
    const now = Math.floor(Date.now() / 1000);
    return [
      ...e.parents.map((a) => this.card(a, this.stats.get(a.address), now, t, {{sparg}}this.stats, this.kids.get(a.address) ?? [])),
      ...e.orphans.map((k) => this.card(k, this.stats.get(k.address), now, t, {{sparg}}this.stats, [], true)),
    ];
  }
}
