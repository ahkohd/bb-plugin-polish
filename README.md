# Polish

A clean, calm bb in the manner of Capy, T3 Code, Conductor and Amp: a theme
with palettes and layout options, plus the pages and shortcuts an agent
workspace should have.

## Theme

Turn it on in Settings, Appearance, or run `bb theme set plugin:polish:polish`.
Switch back with `bb theme reset`.

- A grey window with the thread and its side panel on separate rounded cards.
- Palettes: Capy (cool greys and blue), Conductor (black and green), Amp (deep
  teal and orange) and Flexoki (ink on paper). The accent follows the palette
  or one you pick.
- Backdrops behind the sidebar: plain, glow, aurora or grain.
- Inter or your system font, sans or serif headings, and a 13, 14 or 15px
  transcript.
- Icons: Lucide (the default) or Phosphor in place of BB's own, everywhere BB
  draws an icon, or BB's own; thin, regular or bold lines for any of them.
  The map from BB's icon names is `src/icons/map.json`; run
  `python3 scripts/icons.py` after editing it.
- Calm menus, palette and dialogs; plain tables; rounded code blocks with
  neutral colours.
- The sidebar footer's warning and update pills are hidden. Plugin errors,
  machine issues and updates stay in Settings.

## Pages and pieces

- **Sidebar inbox**: a thread list that never re-orders. Threads stay in the
  order you started them. Each row shows its status on the left (a spinner,
  a yellow dot when it needs you, an accent dot when unread) and its project
  and age on the right, with children under a guide line. Snooze, settle or mute a thread
  and it moves to a shelf docked at the bottom of the sidebar; it comes back
  when it finishes, fails or asks you something. Pick it in Settings,
  Appearance, Thread list. This is
  [Beside](https://github.com/ahkohd/bb-plugin-beside) brought into Polish:
  the first time Polish starts, it copies Beside's shelves and settings over,
  and Settings, Polish, Sidebar can copy them again.
- **Overview**: every thread that needs you, is in progress, is ready for
  review or ran in the last week, as a list or a board. Move with `j` and `k`,
  peek at a thread beside the list and answer it there, filter with `/` or
  by project.
- **New thread page**: a pulse line with a 14-day sparkline, your projects,
  four starters, and what needs you.
- **Polish dock**: a compact sidebar navigation: Search and New thread as
  icons in the sidebar's top row, and labelled rows for the rest. Pick it in
  Settings, Appearance, Navigation.
- **Crew**: a tab beside any thread that started other threads, with filters,
  live timers and a progress bar.
- **Needs-you pill**: shows while any thread waits on you; click to jump to
  the one that has waited longest.
- **Status line**: running, waiting and unread counts under the main area,
  shown only when there is something to count.
- **Zen mode**: the thread alone, with the sidebar and side panel hidden.

## Commands

All are in Settings, Keyboard, where you can rebind them.

| Command | Default shortcut |
| --- | --- |
| Go to the next thread that needs you | Ctrl+Alt+J (Cmd+Option+J) |
| Open Overview | Ctrl+Alt+O (Cmd+Option+O) |
| Toggle zen mode | Ctrl+Alt+Z (Cmd+Option+Z) |
| Next palette, backdrop or accent | none |
| Toggle inset panel or compact density | none |

## Settings

Settings, Polish: look (palette, accent, backdrop), icons (set and line
weight), layout (main area, side
panel, density, status line), text (font, headings, reading size) and
attention (needs-you pill). They are saved per device. Settings, Polish,
Sidebar holds the sidebar's decision mode, which can let a model keep routine
news on its shelf, and the button that copies Beside's shelves over.

## Development

`docs/DESIGN.md` holds the design rules and `docs/HARNESS.md` how to build and
screenshot in a test box. `npm test` runs the unit tests; `bb plugin build`
builds the plugin. The code themes are Flexoki's VS Code themes recoloured
(MIT, see `themes/code/FLEXOKI-LICENSE`).
