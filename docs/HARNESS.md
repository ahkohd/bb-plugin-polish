# Working on Polish in a test box

The box has a private bb (the "test bb") with seeded threads, and Chrome with
Playwright for screenshots. It is separate from the bb that runs your thread.

## Start the test bb

    ~/bbui/start.sh        # idempotent; serves http://127.0.0.1:48886

Talk to it with `~/bbui/tb`, a wrapper for its CLI:

    ~/bbui/tb plugin list
    ~/bbui/tb thread list

Never run a bare `bb` command for this work: bare `bb` talks to the real bb.

## Build and load the plugin

The plugin is installed in the test bb from this directory
(`~/bb-plugin-polish`).

    npx tsc --noEmit -p .          # types
    npx vitest run                 # unit tests
    ~/bbui/tb plugin build         # run from the plugin directory
    ~/bbui/tb plugin reload polish
    ~/bbui/tb theme set plugin:polish:polish

## Screenshots

    node ~/shots/snap.mjs <path> <name> [prefs-json]

loads `http://127.0.0.1:48886<path>` at 1600x1000 in dark and light, saves
`~/shots/out/<name>-dark.png` and `-light.png`, and prints console errors.
`prefs-json` sets Polish's prefs first, for example
`'{"palette":"conductor","layout":"flat"}'`. For clicks, hovers and keys, copy
`~/shots/snap.mjs` and drive the page with Playwright (`playwright-core`, Chrome
at `/usr/bin/google-chrome`, `--no-sandbox`). Look at your screenshots: read
the PNG files and judge them against `docs/DESIGN.md` and the references.

Useful pages:

- `/` - New thread page
- `/plugins/polish/overview` - Overview
- `/projects/proj_f7zup6sg9m/threads/thr_uvg4exz48s` - a thread with four
  subthreads (Crew)
- `/projects/proj_f7zup6sg9m/threads/thr_geabycveqi` - a thread with code
- `/settings/plugins/polish` - Polish settings

Several seeded threads are in an error state on purpose: they count as
"needs you".

## References

`~/ref/` holds screenshots of Capy, T3 Code, Conductor and Amp. Look at them
before designing.

## Done means

- `npx tsc --noEmit -p .` and `npx vitest run` pass.
- `~/bbui/tb plugin build` succeeds and the feature works in the test bb with
  no console errors, in dark and light.
- You looked at your own screenshots and fixed what looked wrong.
- Your work is committed in `~/bb-plugin-polish` (git, one or more commits, no
  attribution trailers). Do not push.
- Final screenshots are in `~/shots/out/`, and your last message lists them
  with one line each on what they show, plus anything you could not do.
