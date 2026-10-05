# Catan Board Generator (clone)

A functional clone of the "Better Catan Board Generator" (catan.bunge.io), rebuilt from
scratch as a dependency-free static site. The board geometry, tile/number distributions,
generation rules, and UI flow replicate the original; the code, stylesheets, and tile
artwork are original implementations (the source site's proprietary images and CSS were
not copied).

## Features

- **Classic** board (3-4-5-4-3 rows, 19 tiles) and **Expansion** board (5-6 players, 30 tiles)
- Shuffle retry loop: boards are regenerated until every enabled house rule passes:
  - 6 & 8 cannot touch (enabled by default)
  - 2 & 12 cannot touch (off by default)
  - same numbers cannot touch (off by default)
  - strong number combos cannot share a point (enabled by default): no board corner may gather numbers whose probability pips total more than 12, rejecting strong combinations like 6-5-9, 8-5-9, 6-6-8 or 8-8-6 (13–15 pips) so no settlement spot is overwhelmingly good
  - same resources cannot touch (off by default; on the expansion board pairs are always allowed and the toggle is hidden)
- Two tile themes, switchable at runtime without reshuffling: **Classic** (original SVG art with a sandy beach rim between hexes) and **Colorblock**
- Sea frame around the classic board with harbor piers and 2:1 / 3:1 trade tokens (2:1 ports show their resource icon), drawn as six interlocking jigsaw pieces numbered 1–6 clockwise (piece 1 fits 2, …, 6 fits 1) as an assembly reference
- Number chits with probability pips; 6/8 highlighted in red; empty desert chit
- Responsive: landscape puts the board on the right, portrait stacks it below
- Options popup with click-outside-to-close; closing after a rule change reshuffles

## Custom artwork (optional)

You can supply your own artwork without touching the code — drop PNG files into
`assets/art/` and they are picked up automatically on load:

- `assets/art/frame.png` — replaces the sea frame behind the classic board
- `assets/art/wood.png`, `sheep.png`, `wheat.png`, `brick.png`, `ore.png`, `desert.png` — replace the SVG tile art

Anything missing falls back to the bundled original art. Use only artwork you
have the rights to use.

## Run

Any static file server works:

```bash
cd catan-board-generator
python3 -m http.server 8080
# then open http://localhost:8080/
```

or `npx serve .`

- `index.html` — Classic board
- `expansion.html` — Expansion board

## Tests

The generator engine is DOM-free and covered by a plain Node test script:

```bash
node test/engine.test.js
```

It verifies board sizes, tile/number distributions, adjacency symmetry (including known
neighbor sets for the classic grid), rule validation, board point geometry (points shared
by tiles match the adjacency triangles), and that strict rule combinations still produce
valid boards.

## Structure

```
catan-board-generator/
├── index.html          # Classic board page
├── expansion.html      # Expansion board page
├── css/
│   ├── common.css      # layout, tiles, chits, themes, popup
│   ├── map-select.css  # Classic/Expansion switch buttons
│   └── orientation.css # landscape/portrait board placement
├── js/
│   ├── engine.js       # pure logic: geometry, adjacency, generation, validation
│   └── board.js        # DOM glue + SVG tile art
├── assets/favicon.svg
└── test/engine.test.js
```

## Notes

- "Settlers of Catan" is a trademark of Catan GmbH (Kosmos). Personal/local use is fine;
  review trademark and branding usage before deploying something like this publicly.
- The Feedback/Contact nav links are placeholders (`#`).
- The expansion board intentionally has no sea frame, matching the original site.
