# Joinery library

Pick by **what meets what** × **material** × **shop**. Write the choice and the reason into `spec.source.assumptions`.
Joint types below are the `type` strings `applyJoinery` understands.

| Connection | Hand tools | Cabinet shop (table saw, router, Domino) | CNC / flat-pack |
|---|---|---|---|
| Apron / rail → leg (solid) | `mortise-tenon`, tenon ⅓ of rail T, 25–35 deep, shoulders 8–12, **mitred** where two meet in a leg | same; or loose tenon (Domino 10×50) → model as `mortise-tenon` tenonT 10 | `dowel` ×2 ⌀8 + corner bracket, or bolt-and-barrel nut |
| Stretcher → leg | `mortise-tenon` 20–25 deep | same | `dowel` ×2 |
| Top → aprons (solid top) | `button` ×6–8, or `figure-8` | `figure-8` or slotted steel clips → `button` | `screw` through slotted holes (note: slotted) |
| Top → aprons (plywood/MDF top) | `screw` (no movement) | `screw` or pocket screws from inside apron → `pocket-screw` | `screw` |
| Shelf → side (fixed) | `dado` ⅓ side T, 6 deep min | `dado` or `dowel` ×3 | `dado` 6 deep, or 32 mm system shelf pins (hardware, no joint) |
| Side → top/bottom of a carcase (plywood) | `dado` + glue | `dado` or `dowel` ×4 | confirmat screws → `screw` ×4, or cam-lock → hardware |
| Back panel → carcase | `dado` 6 wide, panel floats | rabbet + screws → model as `dado` 4 deep | `screw` ×8 into rebate |
| Drawer box corners | half-blind dovetail (not modelled; note it) → `glue` | `dado` (lock rabbet) | `dowel` or confirmat |
| Chair seat rail → leg | `mortise-tenon` 25 deep, mitred | same, or Domino | `dowel` ×2 + glue block |
| Chair crest rail → back post | `mortise-tenon` angled → note the angle | same | `dowel` ×2 |
| Bed rail → post | bed bolt + `mortise-tenon` stub 12 deep | same | bed-rail hook hardware |
| Breadboard end → top | `mortise-tenon` tongue, elongated holes, pegged | same | avoid; note why |
| Edge banding on ply | — | iron-on, note on part | PVC, note on part |
| Glass shelf → side | — | `shelf-pin` ⌀5 ×2 per side, PVC-cushioned pins; 8 mm toughened to ~750 span, 10 mm for books | same |
| Inset glass door → carcase | — | `hinge`, clamp type on the side (no drilling the glass), 2–3 per door; pivot hinges only where there is a flat top and bottom at the hinge edge | same |
| Frame-and-panel door | `mortise-tenon` rails → stiles 20–25 deep, muntins 15; panels `groove` 6 × 10, floating | same, cope-and-stick with stub tenons | slab door, routed pattern (note it) |
| Drawer box | `dado` box ends into sides, bottom `groove` 6 × 6 | same, on `runner` side-mount slides | `dowel` / confirmat |
| Wood box in a steel frame | — | `screw` through 5 mm holes drilled in the tube; frame `weld`ed by a metal shop | same |
| Flat panel → bent corner (in-line) | — | `dowel` ×4 ⌀8, or Domino; corner is a bent lamination (`profile` + `stock.layers`) | — |

## Defaults by furniture type (cabinet shop)

- **Tables, desks, benches:** legs 70–90 square (dining) or 50–60 (side), apron 70–90 high × 22–25 thick, apron top 0–3 mm below leg top, knee clearance ≥ 600 under apron. Top 25–40 thick solid, 18–25 ply. Buttons every 400–600 mm.
- **Chairs:** seat 440–460 high, 380–450 deep, front legs 38–45 square, back posts 45 × 32 with 5–8° rake, seat rails 65–75 × 22, stretchers 22 × 22 (H or box pattern). Crest rail angle 10–15°.
- **Bookshelves / cabinets:** sides 18 ply or 19–22 solid, fixed shelves in dados every 350–400 mm, adjustable shelves on 5 mm pins, back 6–9 ply in a groove, no shelf span over 900 unsupported.
- **Sideboards:** carcase 18–19, plinth or legs 100–150 high, doors overlay 18, drawers on side-mount slides (hardware) or wooden runners (parts).
- **Beds:** posts 70–80 square, rails 150–200 × 30–38 on bed bolts, slats 70 × 18 on ledgers 25 × 25 screwed to rail.

## Stock

Common solid thicknesses after planing: 19/20, 25, 30, 32, 38/40, 45, 50. Over 50 → laminate. Over 200 wide → glue-up. Sheet: 2440 × 1220 (6, 9, 12, 15, 18, 25).

## What the model does not do yet

Tapers, angled joints, dovetails, curves in two directions. Model the bounding box, write the real detail in the part `note`, and say so in `assumptions`. (Curves extruded straight — bent corners, radiused panels — are `profile` parts now.) A maker would rather have an honest box with a note than a wrong curve.
