# Contributing

Thanks for helping. The most useful contributions are new pieces, new materials, new joints and fixes to anything a real maker found wrong.

## Setup

```
git clone https://github.com/JoseChipanaTica/joinery
cd joinery
npm install
npx playwright install chromium   # only needed for capture.mjs
npm test                          # builds and validates every example
```

Node 20.10 or newer. If Playwright's Chromium will not launch, point `CHROMIUM` at any Chrome or Chromium binary.

## Adding an example

1. Make a folder under `examples/` with `spec.json`, `model.js` and `main.js`, copied from the closest existing example.
2. Fill in `spec.source`: what the reference photo shows, the anchors, and every assumption. Do not commit the photo unless you own it.
3. `node pack.mjs <name>` must print `✓ no issues`. Fix collisions in the model with a number; never hide them with the camera.
4. `node build.mjs <name> && node capture.mjs <name> --stills steps`, then read `joinery-out/<name>-sheet.png` against the review checklist in `SKILL.md`.
5. Add a row to the examples table in `SKILL.md` and the gallery in `README.md`.

## Changing the kit

`kit/` is shared by every piece, so a change there can move parts in all of them.

- Run `npm test` and re-capture the sheet for at least the examples your change touches. Put before and after sheets in the pull request.
- `kit/model.js`, `kit/validate.js`, `kit/cutlist.js`, `kit/drawings.js`, `kit/nest.js` and `kit/manual.js` must stay free of three.js; they run in Node for the pack.
- A new joint type needs its features in `applyJoinery`, a validate rule if it can fail, and a line in `SKILL.md` and `templates/joinery-library.md`.
- A new material is an entry in `MATERIALS` in `kit/stage.js` and a line in the Materials section of `SKILL.md`.

## Changing SKILL.md

`SKILL.md` is what Claude reads. Keep it short and imperative and give the reason for each rule, not just the rule. If you change how a step works, run one piece end to end with the new text to check Claude follows it.

## Reporting a problem with a plan

If a cut list, drawing or step is wrong for a piece the skill made, open an issue with the piece's `spec.json` and `model.js`, the `validation.txt`, and what a maker would do instead.
