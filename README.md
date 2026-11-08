# DC Comics: a Herdr Desktop layout

Comic-book night-watch sidebar with animated hero portraits, districts and Claude Code telemetry.

Everything this layout adds to Herdr is in this repo, so it installs on its own. The only other mods it uses ship
with Herdr Desktop. Built against Herdr Desktop 0.1.14.

## Install

```sh
./install.sh
herdr-app do layout.switch --name dc-comics
```

The script copies `layouts/`, `themes/` and `mods/` into `~/.config/herdr-app` (or `$HERDR_APP_HOME`), and `scripts/`
into `~/.config/herdr`. It saves any files it replaces to `backups/` in the Herdr home first. Mods reload by themselves.

## Claude Code stats

Cards get their numbers from a terminal label written by `scripts/claude-desktop.sh`. On each machine that runs
Claude Code, add this to the status line script, where `$input` holds the JSON Claude passes it:

```sh
{ printf '%s' "$input" | ~/.config/herdr/claude-desktop.sh & } 2>/dev/null
```

It needs `jq`, and does nothing outside a Herdr terminal. Without it, sessions still appear, just without stats.

## Tree view

The layers button in the DISTRICTS header swaps the two sidebar lists for one tree: Local and Remote, with each session nested
under its space. `mods/dc-tree` is generated from this layout's own spaces and agents mods, so after changing
either run `python3 tools/tree/build.py`.

## What's here

| Path | What it is |
|---|---|
| `layouts/` | The layout, and its picture for the settings screen, if it has one |
| `themes/` | Its theme |
| `mods/` | Its sidebar and other mods, including the Close / Delete worktree dialog (`session-actions`) |
| `scripts/` | The stats script |
| `tools/` | Scripts that generate parts of it (not needed to install) |

See `NOTICE.md` for what this derives from.
