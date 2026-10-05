/* Catan board generator engine — clean-room implementation.
 * Pure logic only (no DOM): board geometry, adjacency, tile generation
 * and house-rule validation. Usable in the browser and in Node tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ENGINE = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Probability pips per number token (standard Catan dot counts).
  var DOTS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

  // Numbers governed by the "same numbers can touch" toggle.
  // 2/12 and 6/8 have their own dedicated toggles.
  var REGULAR_NUMBERS = [3, 4, 5, 9, 10, 11];

  // A board point (corner shared by up to three tiles) is "strong" when the
  // probability pips of the numbers meeting there total more than this.
  // Combos like 6-5-9 (13), 8-5-9 (13) or 6-6-8 (15) are then rejected so
  // no single settlement spot is overwhelmingly good.
  var MAX_POINT_PIPS = 12;

  var CLASSIC = {
    mode: 'normal',
    rows: [3, 4, 5, 4, 3],
    tilePct: 17.5,                // hex height, % of the square board container
    rowStepFactor: 0.73,          // vertical row spacing, x tilePct
    cellStepFactor: 0.99 * 0.866, // horizontal tile spacing, x tilePct
    rotated: false,               // pointy-top hexes
    numbers: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    resources: [
      'ore', 'ore', 'ore',
      'brick', 'brick', 'brick',
      'sheep', 'sheep', 'sheep', 'sheep',
      'wood', 'wood', 'wood', 'wood',
      'wheat', 'wheat', 'wheat', 'wheat'
    ],
    deserts: 1,
    hasFrame: true
  };

  var EXPANSION = {
    mode: 'expanded',
    rows: [1, 2, 3, 4, 3, 4, 3, 4, 3, 2, 1],
    tilePct: 16,
    rowStepFactor: 0.866 / 1.99,
    cellStepFactor: 1.51 * 0.99,
    rotated: true,                // hexes drawn pointy-top, rotated 90deg (flat-top look)
    numbers: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
    resources: [
      'ore', 'ore', 'ore', 'ore', 'ore',
      'brick', 'brick', 'brick', 'brick', 'brick',
      'sheep', 'sheep', 'sheep', 'sheep', 'sheep', 'sheep',
      'wood', 'wood', 'wood', 'wood', 'wood', 'wood',
      'wheat', 'wheat', 'wheat', 'wheat', 'wheat', 'wheat'
    ],
    deserts: 2,
    hasFrame: false
  };

  // Fisher-Yates, in place. An optional rng (returning [0, 1)) makes
  // generation reproducible for tests; defaults to Math.random.
  function shuffle(list, rng) {
    var rand = rng || Math.random;
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  // Tile center positions as % of the square board container.
  function computePositions(cfg) {
    var centerRow = Math.floor(cfg.rows.length / 2);
    var cellStep = cfg.cellStepFactor * cfg.tilePct;
    var rowStep = cfg.rowStepFactor * cfg.tilePct;
    var positions = [];
    cfg.rows.forEach(function (len, row) {
      var y = 50 + (row - centerRow) * rowStep;
      var evenShift = (row % 2) * cellStep / 2;
      var firstX = 50 - Math.floor(len / 2) * cellStep;
      for (var i = 0; i < len; i++) {
        positions.push({ x: firstX + evenShift + i * cellStep, y: y });
      }
    });
    return positions;
  }

  /* Adjacency derived from geometry: two tiles are neighbors when their
   * centers sit at the grid's minimum hex-to-hex distance. The 5% tolerance
   * absorbs the slightly compressed spacing but never reaches the next
   * distance ring (classic: ~14.8/15.0 vs 25.5; expansion: ~13.8/13.9 vs 23.9),
   * so this is exact for both layouts and symmetric by construction. */
  function computeAdjacency(cfg) {
    var positions = computePositions(cfg);
    var count = positions.length;
    var pairs = [];
    var minDistance = Infinity;
    for (var i = 0; i < count; i++) {
      for (var j = i + 1; j < count; j++) {
        var dx = positions[i].x - positions[j].x;
        var dy = positions[i].y - positions[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        pairs.push({ a: i, b: j, d: d });
        if (d < minDistance) minDistance = d;
      }
    }
    var threshold = minDistance * 1.05;
    var adjacency = [];
    for (var t = 0; t < count; t++) adjacency.push([]);
    pairs.forEach(function (pair) {
      if (pair.d <= threshold) {
        adjacency[pair.a].push(pair.b);
        adjacency[pair.b].push(pair.a);
      }
    });
    return adjacency;
  }

  /* Corner offsets of one tile relative to its center, in % of the board
   * container, matching the CSS hex shape (pointy-top; the expansion tiles
   * are rotated 90deg for display, so their corners are the flat-top set). */
  function cornerOffsets(cfg) {
    var h = cfg.tilePct;
    var w = h * 0.866;
    if (!cfg.rotated) {
      return [
        { x: 0, y: -h / 2 }, { x: w / 2, y: -h / 4 }, { x: w / 2, y: h / 4 },
        { x: 0, y: h / 2 }, { x: -w / 2, y: h / 4 }, { x: -w / 2, y: -h / 4 }
      ];
    }
    return [
      { x: h / 2, y: 0 }, { x: h / 4, y: w / 2 }, { x: -h / 4, y: w / 2 },
      { x: -h / 2, y: 0 }, { x: -h / 4, y: -w / 2 }, { x: h / 4, y: -w / 2 }
    ];
  }

  /* Groups of tiles sharing each board point (vertex). Corners are clustered
   * geometrically: both layouts compress the grid slightly, so coincident
   * corners drift apart by well under 1% while distinct points sit ~7% from
   * each other, so a tolerance of 15% of the tile size separates them
   * exactly for both layouts. */
  function computePointGroups(cfg) {
    var positions = computePositions(cfg);
    var offsets = cornerOffsets(cfg);
    var points = [];
    positions.forEach(function (pos, tile) {
      offsets.forEach(function (o) {
        points.push({ tile: tile, x: pos.x + o.x, y: pos.y + o.y });
      });
    });
    var tolerance = cfg.tilePct * 0.15;
    var clusters = [];
    points.forEach(function (p) {
      for (var c = 0; c < clusters.length; c++) {
        var rep = clusters[c][0];
        if (Math.abs(rep.x - p.x) <= tolerance && Math.abs(rep.y - p.y) <= tolerance) {
          clusters[c].push(p);
          return;
        }
      }
      clusters.push([p]);
    });
    return clusters.map(function (cluster) {
      var tiles = [];
      cluster.forEach(function (p) {
        if (tiles.indexOf(p.tile) === -1) tiles.push(p.tile);
      });
      return tiles;
    });
  }

  function dotString(count) {
    var out = '';
    for (var i = 0; i < count; i++) out += '.';
    return out;
  }

  // Shuffle number tokens and terrain independently, pair by index,
  // then append the deserts and shuffle everything (like the original site).
  function generateTiles(cfg, rng) {
    var numbers = shuffle(cfg.numbers.slice(), rng);
    var resources = shuffle(cfg.resources.slice(), rng);
    var tiles = numbers.map(function (chit, index) {
      return { chit: chit, resource: resources[index], dots: dotString(DOTS[chit]) };
    });
    for (var d = 0; d < cfg.deserts; d++) {
      tiles.push({ chit: '', resource: 'desert', dots: '' });
    }
    return shuffle(tiles, rng);
  }

  function hasAdjacentPair(tiles, adjacency, matches) {
    for (var i = 0; i < tiles.length; i++) {
      if (!matches(tiles[i])) continue;
      var neighbors = adjacency[i];
      for (var k = 0; k < neighbors.length; k++) {
        var j = neighbors[k];
        if (j > i && matches(tiles[j])) return true;
      }
    }
    return false;
  }

  function validate(tiles, adjacency, options, mode, pointGroups) {
    if (!options.allow68 && hasAdjacentPair(tiles, adjacency, function (t) {
      return t.chit === 6 || t.chit === 8;
    })) return false;

    if (!options.allow212 && hasAdjacentPair(tiles, adjacency, function (t) {
      return t.chit === 2 || t.chit === 12;
    })) return false;

    if (!options.allowSameNumbers) {
      for (var r = 0; r < REGULAR_NUMBERS.length; r++) {
        var n = REGULAR_NUMBERS[r];
        if (hasAdjacentPair(tiles, adjacency, function (t) { return t.chit === n; })) return false;
      }
    }

    // Balance rule: no point may gather a strong combination of numbers —
    // the pips of everything meeting there must stay within the cap. Points
    // with fewer than three tiles can never exceed it (best pair is 10 pips),
    // so effectively this blocks combos like 6-5-9, 8-5-9 or 6-6-8.
    if (!options.allowStrongPoints && pointGroups) {
      for (var p = 0; p < pointGroups.length; p++) {
        var group = pointGroups[p];
        var pips = 0;
        for (var t = 0; t < group.length; t++) {
          pips += DOTS[tiles[group[t]].chit] || 0;
        }
        if (pips > MAX_POINT_PIPS) return false;
      }
    }

    // Classic: pairs allowed when the toggle is on, otherwise no two same
    // terrains may touch. Expansion always allows pairs (toggle is hidden).
    var maxGroup = (options.allowSameResource || mode !== 'normal') ? 2 : 1;
    for (var i = 0; i < tiles.length; i++) {
      var sameCount = 1;
      var neighbors = adjacency[i];
      for (var k = 0; k < neighbors.length; k++) {
        if (tiles[neighbors[k]].resource === tiles[i].resource) sameCount++;
      }
      if (sameCount > maxGroup) return false;
    }
    return true;
  }

  var MAX_ATTEMPTS = 500000;

  // Retry until the shuffle satisfies every enabled rule. Typical combos hit
  // a valid board within a handful of attempts; the cap only guards the very
  // strict "nothing may touch" combo (~1 valid board per ~62k shuffles on the
  // classic board) and guarantees termination instead of hanging like a
  // naive infinite loop.
  function generateValidBoard(cfg, adjacency, options, rng, pointGroups) {
    var points = pointGroups || computePointGroups(cfg);
    var candidate = generateTiles(cfg, rng);
    var attempts = 0;
    while (!validate(candidate, adjacency, options, cfg.mode, points)) {
      candidate = generateTiles(cfg, rng);
      if (++attempts >= MAX_ATTEMPTS) break;
    }
    return candidate;
  }

  return {
    CLASSIC: CLASSIC,
    EXPANSION: EXPANSION,
    REGULAR_NUMBERS: REGULAR_NUMBERS,
    MAX_POINT_PIPS: MAX_POINT_PIPS,
    shuffle: shuffle,
    computePositions: computePositions,
    computeAdjacency: computeAdjacency,
    computePointGroups: computePointGroups,
    generateTiles: generateTiles,
    validate: validate,
    generateValidBoard: generateValidBoard
  };
});
