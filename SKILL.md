---
name: joinery
description: Turns a photo of a piece of furniture (a table, chair, bench, shelf, sideboard, bed, desk) into a buildable 3D model a carpenter can make from — every part as real stock with real joinery, an interactive offline HTML page with an exploded view, x-ray and step-by-step assembly, plus the maker pack - cut list, dimensioned shop drawings, what wood to buy, hardware and an illustrated assembly manual. Use when someone sends a furniture picture and wants it built, wants "plans", a "cut list", an "exploded view", "how is this made", "can a carpenter make this", or wants to redesign a piece in different dimensions or wood.
license: MIT
compatibility: Node 20.10+ (npm install once in the skill folder); Chromium via Playwright or the CHROMIUM env var for review stills
---

# Joinery

One piece, one page, one pack. The visitor sees the piece assembled, drags a slider and it comes apart, steps through how it goes together, clicks a part and reads its stock size. The same model that moves the parts writes the cut list, the drawings and the manual, so nothing on paper can disagree with what is on screen.

`SKILL_DIR` is the folder this file lives in. Builds and the pack go to `./joinery-out` of the folder you run from.

## First run

```
cd "$SKILL_DIR" && npm install
```

Node 20.10+. For review stills and manual images you need Chromium: `npx playwright install chromium`, or point `CHROMIUM` at any Chrome/Chromium binary (`CHROMIUM=/usr/bin/google-chrome`).

## The pipeline

```
photo + anchors ─► spec.json ─► model.js ─► validate ─► page ─► stills ─► pack
```

| Step | Command | What you get |
|---|---|---|
| 1. Interpret | you, reading the photo | `spec.json`: type, anchors, materials, every part named, every joint chosen, every assumption written down |
| 2. Model | you, writing `model.js` | the piece as a function of its params: boxes, joints, steps |
| 3. Validate + pack | `node "$SKILL_DIR/pack.mjs" ./my-piece` | refuses to pack if anything collides or floats; writes cut list, drawings, board and sheet cutting diagrams, stock, tools and finishing, manual (and `manual.pdf` when Chromium is there) |
| 4. Build page | `node "$SKILL_DIR/build.mjs" ./my-piece` | `joinery-out/dist/my-piece.html`, offline, ~570 KB |
| 5. Review | `node "$SKILL_DIR/capture.mjs" my-piece --stills steps` | a contact sheet of every view and step — read it, fix, repeat |
| 6. Pack again | `node "$SKILL_DIR/pack.mjs" ./my-piece` | manual and PDF now carry the step images |

Start by copying the example closest to the piece. Each has every file a piece needs: `spec.json`, `model.js`, `main.js`. A piece usually lives in the person's own folder, not in `SKILL_DIR`: after copying, change the two `../../kit/` imports (in `model.js` and `main.js`) to the absolute path `$SKILL_DIR/kit/`.

| Example | Copy it for | Shows |
|---|---|---|
| `parsons-table` | a simple table, desk, bench | the minimum: legs, aprons, top, mortise-and-tenon, buttons. 64 lines |
| `walnut-racetrack-table` | round, oval or tapered parts | `roundedRect` / `circle` profiles, tapered round legs, tenons short enough to miss each other in the leg |
| `walnut-display-cabinet` | a case piece with curves or glass | bent-lamination corners (`quarterRing`, `stock.layers`), glass doors on clamp hinges, shelf pins, a rebated back, a plinth |
| `walnut-entry-unit` | built-ins, wardrobes, kitchen-style units | several carcasses, frame-and-panel doors, drawers on runners, floating shelves, painted MDF next to veneer, LED and hook fittings |
| `walnut-hallway-unit` | a mixed steel-and-wood piece | a welded steel frame holding wooden boxes, cane-panel doors, an open niche left round an electrical panel |

## Step 1: read the photo honestly

A single photo gives **no scale and no hidden structure**. This skill is design interpretation, not photogrammetry. Before writing any geometry:

1. **Get anchors.** Ask for one to three real dimensions (overall L × D × H, or one known one like "the top is 180 cm"). If the person cannot give any, use the ergonomic standards in `kit/validate.js` (dining 750 H, seat 450 H) and say so. Every other dimension is a proportion read from the photo times the anchor.
2. **Name the type.** `dining-table`, `chair`, `bookshelf`… this picks the ergonomic checks and the typical construction.
3. **List what you can see and what you can't.** Legs, top, visible shelves are `visible`. Aprons under a thick top, back panels, stretchers, drawer runners, corner blocks are `inferred` — mark them `inferred: true` on the part so they are flagged in every output. The maker will override them; they must know which ones are yours.
4. **Choose the joinery from the library** (`templates/joinery-library.md`), keyed by type × material × shop. Ask what shop the maker has if it is not obvious (`shop`: `hand`, `cabinet`, `cnc`); it also picks the tool list. Default to a cabinet shop: mortise-and-tenon for legs/aprons, dados for shelves, dowels or Dominos for panels, pocket screws only where hidden. Write the choice and the reason into `spec.source.assumptions`.
5. **Read the material and finish.** Species from colour and figure, thickness from edge proportion, edge treatment (roundover / chamfer / sharp) from highlights. Thickness must land on a stock size (`STOCK_T` in `kit/validate.js`) — 40, not 38.7. Set `finish` from the sheen: an open, matt surface is `hardwax-oil` (the default) or `oil`, an even satin film is `lacquer`. Painted and metal parts follow their material.

Write all of that into `spec.json` using `templates/spec.schema.json`. The spec is for humans: the maker reads `source.assumptions` before anything else.

## Step 2: build the model

`model.js` exports `piece = definePiece({name, type, shop, finish, params, source, materials, build})`. `build(P)` returns `{parts, joints, steps, hardware}`. The example is 70 lines; a chair is about 120.

**Parts** are axis-aligned boxes in their assembled pose: `box(id, name, [sx, sy, sz], [x, y, z], {grain, material, edge, explode, inferred, note})`. x is length, y is up with the floor at 0, z is depth. `grain` is the axis the wood runs along — it decides the stock length in the cut list and the ring pattern in the render. Parts that are the same cut get the same `name` and merge into one cut-list line; `id` stays unique.

**Curved and radiused parts** keep a bounding box for `size`/`at` and add `profile: {axis, path, note}`: the real outline across `axis`, centred on the box (`quarterRing(R, t, [su, sv])` for a bent corner, `roundedRect(w, h, radii)` for radiused glass, a back or a racetrack top, `circle(d)` for a round leg; `profile.taper: {to, end}` tapers it toward one end). It renders extruded, validates on its outline, and draws as its outline. When the box is not the stock (a bent lamination), add `stock: {L, W, T, layers, layerT}` and the cut list and buying list use that. A part curved in two directions (a carved chair back, a compound splat) has no body type yet: tell the person, model the nearest straight extrusion, and say so in its `note`.

**Fittings** are bought hardware drawn on a part, not cut: `fittings: [{kind, size, at, material, axis, dir, holes: {n, d, cc, axis}}]` with `at` relative to the part's centre. Pulls, hooks and LED profiles render; their screw holes land on the part's drawing. List them in `hardware` too.

**Colours per piece:** an entry in the `materials` map may carry `base`, `dark`, `ring`, `streak`, `rough`, `clearcoat`, `env` to retune a kit material to the photo without changing other pieces. Dark oiled woods on a big flat top need `rough` ≈ 0.9 or the key light's sheen greys them out; sample the photo and the render and compare numbers, not impressions.

**Joints** connect two part ids: `{a, b, type}` where `a` carries the tenon/screw and `b` receives it. Types: `mortise-tenon` (tenonLen, tenonT, shoulder, mitred), `dowel` (count, d, len), `dado` (depth), `rebate` (face, depth: a back in a rebate along b's edge), `shelf-pin` (count, d, len, inset: a shelf on pins in b), `hinge` (face, at: [world y…], cup: 35 to bore the cup in a: a door facing +z hung on b), `groove` (width, depth: a panel or drawer bottom floating in b's edge or face), `runner` (a drawer box on side-mount slides in b), `weld` (steel to steel), `pocket-screw`, `button`, `figure-8`, `screw`, `glue`. `shelf-pin` and `hinge` allow the few mm of clearance the hardware bridges; every part must be joined to the rest or validate refuses. `applyJoinery` writes the matching features onto both members: the tenon lengthens the stock in the cut list, the mortise shows up on the leg's drawing with its face and position, and both render. A joint also tells `validate` that these two bodies are allowed to touch.

**Steps** are the manual: `{title, parts: [ids], note, check, view}`. Every part must appear in exactly one step. Order them the way a maker would: sub-assemblies first (end frames, drawer boxes), then what joins them, then what sits on top, with the piece upside down when that is how it is done. `view` sets the camera for that step on the page and in the manual.

**Params.** Everything is a number in `P`. Change `L` and the aprons, tenons, button spacing and cut list follow. That is the point: the same `model.js` makes the 1600 version and the 2200 version.

## Rules that decide whether it can be built

1. **Start from the photo, never from imagination.** Build against it and compare renders side by side: silhouette, leg-to-top ratio, overhang, where the shadow line of the apron falls. A piece invented from "a nice oak table" comes out generic; the same code rebuilds the real one closely when it has something to match.
2. **Real stock.** Thickness is a stock size. Nothing wider than 200 mm is one board — `pack.mjs` turns it into a glue-up of strips and says so. Nothing thicker than 50 mm is one board — it becomes a lamination. Grain runs along the length of every stick, or validate warns about short grain.
3. **Every joint is a real joint.** Two parts may only share volume through a declared joint. Tenons that meet inside a leg must be `mitred: true` or shortened; validate checks the collision. A wide solid top must be held with buttons, figure-8s or slotted holes — never glued rigid — and validate warns if it is.
4. **Fix collisions with a number.** When validate reports a part passing through another, change a value in `P` or in `build`. Never hide it with the camera.
5. **Write the assumption, not just the part.** An apron the photo did not show is `inferred: true` with a `note`. The manual's first box lists every assumption.
6. **One number, one source.** The cut list, the drawing, the HUD on the page and the manual all read `stockOf(part)`. If a number looks wrong, fix the model, not the output.

## Live page rules

- The page is one offline HTML file under 1 MB (three.js inlined). Big pieces with many parts stay fast because every part is one rounded box and the wood is a shader, not a texture.
- Light studio, warm key, cool fill, soft ground shadow. The wood shader draws flat-sawn figure along `grain` and end grain on the ends automatically. Keep `roughness ≥ 0.45`; glossy wood on a pale ground reads as plastic.
- Left alone for 20 s the page tours itself: explode, step through, underside x-ray. Any input hands control back.
- URL state drives capture: `?step=2`, `?explode=1`, `?iso=leg-fl`, `?view=under&xray=1`, `?panel=0`. With any of these set the page snaps instead of animating, so a still is the same at 5 fps as at 60.

## Review loop

You cannot look at the page; you can look at stills. Never report a piece as done without reading a sheet of the current build.

1. `node "$SKILL_DIR/capture.mjs" <name> --stills steps` → `joinery-out/<name>-sheet.png`: assembled, exploded, front, underside x-ray, one tile per step.
2. Read every tile against the checklist. Put the reference photo next to the `front` and `assembled` tiles.
3. For a part, `--stills parts` isolates each one; for one state, `--still "step=3&view=under"`.
4. Fix, rebuild, go back to 1. Stop when a pass finds nothing.
5. Open `joinery-out/<name>/manual.html` the same way and read it as the maker would.

Checklist:

- **Proportion.** Against the photo: leg thickness vs length, top thickness vs length, overhang, height of the apron line. Within 5 % or change a param.
- **Joinery.** Mortises appear on the faces the aprons meet; tenons visible in the exploded view and in x-ray; nothing floats in mid-air in the exploded view (a part with no joint has no explode vector that makes sense).
- **Steps.** Each step adds something you can see; the camera shows the parts being added; parts already placed are visible underneath. Step 1 is never the top.
- **Drawings.** Every mortise, dado and hole on a drawing names its face and distance from the end. Cut-list lengths that include tenons say so.
- **Stock.** The stock list has no board wider than 200 or thicker than 50; glue-ups and laminations are listed. Every part sits on a board or sheet in the cutting diagrams.
- **Tools and finish.** `tools.md` lists what the maker's shop would use, and the clamp lengths make sense for the biggest glue-up. Painted, veneered and metal parts each get their own finish.
- **Render.** Nothing within 60 px of an edge, the panel never covers the piece, near-white woods (maple, ash) have a visible edge against the pale ground.

## Materials

`kit/stage.js` → `MATERIALS`: white-oak, red-oak, walnut, maple, ash, beech, pine, cherry, birch-ply, mdf, steel, brass. Add a species as base/dark colours plus ring and streak strength. Also: walnut-mdf, walnut-bendply (veneered sheet), mdf-black, glass (transparent, drawn by its edges, ordered cut to size in the pack rather than cut from boards). The `materials` map in `definePiece` names them for the cut list ("White oak, solid").
