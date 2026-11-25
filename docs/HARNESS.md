# Working on Polish in a test box

The box has a private bb (the "test bb", 0.50.1) with seeded threads in three
projects (ky, execa, chalk), and Chrome with Playwright for screenshots. It is
separate from the bb that runs your thread.

## Start the test bb

    ~/bbui/start.sh        # idempotent; serves http://127.0.0.1:48886

It also starts `~/bbui/mock-llm.mjs`, a canned OpenAI-compatible endpoint on
port 11999, so threads get replies without a paid model. Talk to the test bb
with `~/bbui/tb`, a wrapper for its CLI:

    ~/bbui/tb plugin list
    ~/bbui/tb thread list

Never run a bare `bb` command for this work: bare `bb` talks to the real bb.

To add threads, spawn them on the mock model. A prompt containing `SLOW`
keeps the thread running for 20 minutes; `--parent-thread <id>` makes a
child; `--pinned` pins it. A thread spawned on `ollama-cloud/glm-5.3` fails
at once, which is a cheap way to get a thread that needs you.

    ~/bbui/tb thread spawn --project <id> --provider pi --model mock/mock-1 \
      --permission-mode full --title "Title" --prompt "SLOW do something"

Project ids are in `~/bbui/projects.txt` (ky, execa, chalk); the parent
threads in `~/bbui/parents.txt`.

## Build and load the plugin

The plugin is installed in the test bb from this directory
(`~/bb-plugin-polish`).

    npx tsc --noEmit -p .          # types
    npx vitest run                 # unit tests
    ~/bbui/tb plugin build         # run from the plugin directory
    ~/bbui/tb plugin reload polish

The theme, `polish/dock` navigation and `polish/inbox` thread list are
already selected, as on the owner's bb.

## Screenshots

    node ~/shots/snap.mjs <path> <name> [prefs-json] [width] [height]
    node ~/shots/side.mjs <path> <name> [prefs-json] [height]

`snap.mjs` loads `http://127.0.0.1:48886<path>` at 1600x1000 (2x) in dark and
light and saves `~/shots/out/<name>-dark.png` and `-light.png`. `side.mjs`
saves only the sidebar, `~/shots/out/<name>-side-dark.png` and `-light.png`.
Both print console errors. `prefs-json` sets Polish's prefs first, for example
`'{"palette":"flexoki"}'`. For clicks, hovers and keys, copy one of them and
drive the page with Playwright (`playwright-core`, Chrome at
`/usr/bin/google-chrome`, `--no-sandbox`). Look at your screenshots and judge
them against `docs/DESIGN.md` and the references.

Useful pages:

- `/` - New thread page
- `/projects/<ky>/threads/<second id in parents.txt>` - a running thread
  with three children
- `/plugins/polish/overview` - Overview
- `/settings/plugins/polish` - Polish settings

## References

`~/ref/` holds screenshots of Capy, T3 Code, Conductor and Amp, and
`~/ref/sdk/` the Plugin SDK notes. Look at them before designing.

## Done means

- `npx tsc --noEmit -p .` and `npx vitest run` pass.
- `~/bbui/tb plugin build` succeeds and the feature works in the test bb with
  no console errors, in dark and light.
- You looked at your own screenshots and fixed what looked wrong.
- Your work is committed in `~/bb-plugin-polish` (git, one or more commits, no
  attribution trailers). Do not push.
- Final screenshots are in `~/shots/out/`, and your last message lists them
  with one line each on what they show, plus anything you could not do.
