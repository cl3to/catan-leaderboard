/* Sanity tests for the generator engine. Run: node test/engine.test.js */
'use strict';

var assert = require('assert');
var ENGINE = require('../js/engine.js');

function count(list, value) {
  return list.filter(function (x) { return x === value; }).length;
}

function sorted(list) {
  return list.slice().sort(function (a, b) { return a - b; });
}

// Deterministic PRNG so the tests are reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assertSymmetric(adjacency) {
  adjacency.forEach(function (neighbors, i) {
    neighbors.forEach(function (j) {
      assert.ok(adjacency[j].indexOf(i) !== -1,
        'adjacency not symmetric: ' + i + ' -> ' + j);
    });
  });
}

function assertNoForbiddenPair(tiles, adjacency, predicate, label) {
  tiles.forEach(function (tile, i) {
    if (!predicate(tile)) return;
    adjacency[i].forEach(function (j) {
      if (j > i && predicate(tiles[j])) {
        assert.fail(label + ': tiles ' + i + ' and ' + j + ' violate the rule');
      }
    });
  });
}

function assertBalancedPoints(tiles, pointGroups, label) {
  pointGroups.forEach(function (group) {
    var pips = group.reduce(function (sum, t) { return sum + tiles[t].dots.length; }, 0);
    assert.ok(pips <= ENGINE.MAX_POINT_PIPS,
      label + ': point tiles [' + group + '] total ' + pips + ' pips');
  });
}

function sortedTripleKeys(groups) {
  return groups.filter(function (g) { return g.length === 3; })
    .map(function (g) { return g.slice().sort(function (a, b) { return a - b; }).join('-'); })
    .sort();
}

// Every mutually-adjacent tile triple in a hex grid shares one point.
function adjacencyTriangles(adjacency) {
  var keys = [];
  for (var i = 0; i < adjacency.length; i++) {
    adjacency[i].forEach(function (j) {
      if (j <= i) return;
      adjacency[i].forEach(function (k) {
        if (k <= j) return;
        if (adjacency[j].indexOf(k) !== -1) keys.push(i + '-' + j + '-' + k);
      });
    });
  }
  return keys.sort();
}

function assertPointGroupsWellFormed(groups, adjacency, tileCount, label) {
  var incidences = groups.reduce(function (sum, g) { return sum + g.length; }, 0);
  assert.strictEqual(incidences, tileCount * 6, label + ': every tile corner clusters once');
  groups.forEach(function (group) {
    assert.ok(group.length >= 1 && group.length <= 3, label + ': point holds 1-3 tiles');
    group.forEach(function (a) {
      group.forEach(function (b) {
        if (a !== b) {
          assert.ok(adjacency[a].indexOf(b) !== -1,
            label + ': tiles ' + a + ' and ' + b + ' share a point but not an edge');
        }
      });
    });
  });
  assert.deepStrictEqual(sortedTripleKeys(groups), adjacencyTriangles(adjacency),
    label + ': three-tile points exactly match adjacency triangles');
}

var DEFAULTS = { allow68: false, allow212: true, allowSameNumbers: true, allowSameResource: true, allowStrongPoints: false };
var STRICT = { allow68: false, allow212: false, allowSameNumbers: false, allowSameResource: false, allowStrongPoints: false };

// --- classic -----------------------------------------------------------

var classic = ENGINE.CLASSIC;
var classicPos = ENGINE.computePositions(classic);
assert.strictEqual(classicPos.length, 19, 'classic has 19 tiles');
classicPos.forEach(function (p) {
  assert.ok(p.x >= 0 && p.x <= 100, 'classic x in range: ' + p.x);
  assert.ok(p.y >= 0 && p.y <= 100, 'classic y in range: ' + p.y);
});

var classicAdj = ENGINE.computeAdjacency(classic);
assert.strictEqual(classicAdj.length, 19);
assertSymmetric(classicAdj);

// Known neighbor sets of the classic 3-4-5-4-3 grid.
assert.deepStrictEqual(sorted(classicAdj[0]), [1, 3, 4], 'tile 0 neighbors');
assert.deepStrictEqual(sorted(classicAdj[4]), [0, 1, 3, 5, 8, 9], 'tile 4 neighbors');
assert.deepStrictEqual(sorted(classicAdj[7]), [3, 8, 12], 'tile 7 neighbors');

assert.strictEqual(classicAdj[0].length, 3, 'corner degree');
assert.strictEqual(Math.max.apply(null, classicAdj.map(function (a) { return a.length; })), 6,
  'max degree 6');

var classicGroups = ENGINE.computePointGroups(classic);
assertPointGroupsWellFormed(classicGroups, classicAdj, 19, 'classic point groups');

// Distributions and rule compliance across many shuffles.
for (var s = 0; s < 200; s++) {
  var tiles = ENGINE.generateValidBoard(classic, classicAdj, DEFAULTS, mulberry32(1000 + s));
  assert.strictEqual(tiles.length, 19);
  var resources = tiles.map(function (t) { return t.resource; });
  assert.strictEqual(count(resources, 'wood'), 4, '4 wood');
  assert.strictEqual(count(resources, 'sheep'), 4, '4 sheep');
  assert.strictEqual(count(resources, 'wheat'), 4, '4 wheat');
  assert.strictEqual(count(resources, 'brick'), 3, '3 brick');
  assert.strictEqual(count(resources, 'ore'), 3, '3 ore');
  assert.strictEqual(count(resources, 'desert'), 1, '1 desert');
  var chits = sorted(tiles.filter(function (t) { return t.chit !== ''; })
    .map(function (t) { return t.chit; }));
  assert.deepStrictEqual(chits, [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    'classic number tokens');
  assert.ok(ENGINE.validate(tiles, classicAdj, DEFAULTS, 'normal', classicGroups),
    'default rules pass');
  assertNoForbiddenPair(tiles, classicAdj, function (t) {
    return t.chit === 6 || t.chit === 8;
  }, '6/8 adjacency');
  assertBalancedPoints(tiles, classicGroups, 'classic strong points');
}

// Strict combo (everything forbidden) still yields valid boards. It is rare
// (~1 valid board per ~62k shuffles), so a few seeded runs are enough.
[7, 1234, 99991].forEach(function (seed) {
  var strictTiles = ENGINE.generateValidBoard(classic, classicAdj, STRICT, mulberry32(seed));
  assert.ok(ENGINE.validate(strictTiles, classicAdj, STRICT, 'normal'), 'strict rules pass');
});

// --- expansion ---------------------------------------------------------

var expansion = ENGINE.EXPANSION;
var expPos = ENGINE.computePositions(expansion);
assert.strictEqual(expPos.length, 30, 'expansion has 30 tiles');
expPos.forEach(function (p) {
  assert.ok(p.x >= 0 && p.x <= 100, 'expansion x in range: ' + p.x);
  assert.ok(p.y >= 0 && p.y <= 100, 'expansion y in range: ' + p.y);
});

var expAdj = ENGINE.computeAdjacency(expansion);
assert.strictEqual(expAdj.length, 30);
assertSymmetric(expAdj);

// Geometry of the flat-top diamond: corners have 3 neighbors, interior 6.
assert.deepStrictEqual(sorted(expAdj[0]), [1, 2, 4], 'tile 0 neighbors');
assert.deepStrictEqual(sorted(expAdj[4]), [0, 1, 2, 7, 8, 11], 'tile 4 neighbors');
assert.strictEqual(Math.max.apply(null, expAdj.map(function (a) { return a.length; })), 6,
  'max degree 6');
// Flat-top hexes in the same visual row are 1.5 widths apart: not neighbors.
assert.strictEqual(expAdj[3].indexOf(5), -1, 'same-row tiles not adjacent on expansion');

var expansionGroups = ENGINE.computePointGroups(expansion);
assertPointGroupsWellFormed(expansionGroups, expAdj, 30, 'expansion point groups');

for (var e = 0; e < 200; e++) {
  var expTiles = ENGINE.generateValidBoard(expansion, expAdj, DEFAULTS, mulberry32(5000 + e));
  assert.strictEqual(expTiles.length, 30);
  var expResources = expTiles.map(function (t) { return t.resource; });
  assert.strictEqual(count(expResources, 'wood'), 6, '6 wood');
  assert.strictEqual(count(expResources, 'sheep'), 6, '6 sheep');
  assert.strictEqual(count(expResources, 'wheat'), 6, '6 wheat');
  assert.strictEqual(count(expResources, 'brick'), 5, '5 brick');
  assert.strictEqual(count(expResources, 'ore'), 5, '5 ore');
  assert.strictEqual(count(expResources, 'desert'), 2, '2 deserts');
  var expChits = sorted(expTiles.filter(function (t) { return t.chit !== ''; })
    .map(function (t) { return t.chit; }));
  assert.deepStrictEqual(expChits,
    [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
    'expansion number tokens');
  assert.ok(ENGINE.validate(expTiles, expAdj, DEFAULTS, 'expanded', expansionGroups),
    'default rules pass');
  assertBalancedPoints(expTiles, expansionGroups, 'expansion strong points');
}

// --- validation unit checks --------------------------------------------
// Run against a small controlled graph (path 0-1-2-3) so each rule can be
// isolated from the rest of the board.

function makeTile(chit, resource) {
  return { chit: chit, resource: resource, dots: '' };
}

var chainAdj = [[1], [0, 2], [1, 3], [2]];

function OPT(allow68, allow212, allowSameNumbers, allowSameResource, allowStrongPoints) {
  return {
    allow68: allow68,
    allow212: allow212,
    allowSameNumbers: allowSameNumbers,
    allowSameResource: allowSameResource,
    allowStrongPoints: allowStrongPoints
  };
}

// 6 next to 8.
var pairTiles = [makeTile(6, 'ore'), makeTile(8, 'brick'), makeTile(3, 'sheep'), makeTile(9, 'wheat')];
assert.strictEqual(ENGINE.validate(pairTiles, chainAdj, OPT(false, true, true, true, true), 'normal'),
  false, '6 next to 8 rejected');
assert.strictEqual(ENGINE.validate(pairTiles, chainAdj, OPT(true, true, true, true, true), 'normal'),
  true, '6 next to 8 allowed when toggle on');

// 2 next to 12.
var edgeTiles = [makeTile(2, 'ore'), makeTile(12, 'brick'), makeTile(3, 'sheep'), makeTile(9, 'wheat')];
assert.strictEqual(ENGINE.validate(edgeTiles, chainAdj, OPT(true, false, true, true, true), 'normal'),
  false, '2 next to 12 rejected');
assert.strictEqual(ENGINE.validate(edgeTiles, chainAdj, OPT(true, true, true, true, true), 'normal'),
  true, '2 next to 12 allowed when toggle on');

// Twin 5s on adjacent tiles.
var twinTiles = [makeTile(5, 'ore'), makeTile(5, 'brick'), makeTile(3, 'sheep'), makeTile(9, 'wheat')];
assert.strictEqual(ENGINE.validate(twinTiles, chainAdj, OPT(true, true, false, true, true), 'normal'),
  false, 'twin 5s rejected when same numbers cannot touch');
assert.strictEqual(ENGINE.validate(twinTiles, chainAdj, OPT(true, true, true, true, true), 'normal'),
  true, 'twin 5s allowed when toggle on');

// Resource pair on adjacent tiles.
var resPair = [makeTile(2, 'ore'), makeTile(3, 'ore'), makeTile(4, 'sheep'), makeTile(9, 'wheat')];
assert.strictEqual(ENGINE.validate(resPair, chainAdj, OPT(true, true, true, false, true), 'normal'),
  false, 'resource pair rejected when same resource cannot touch');
assert.strictEqual(ENGINE.validate(resPair, chainAdj, OPT(true, true, true, true, true), 'normal'),
  true, 'resource pair allowed when toggle on');

// Resource trio: the middle tile touches two same resources, which is
// forbidden even when the "same resource can touch" toggle is on (pairs only).
var resTrio = [makeTile(2, 'ore'), makeTile(3, 'ore'), makeTile(4, 'ore'), makeTile(9, 'sheep')];
assert.strictEqual(ENGINE.validate(resTrio, chainAdj, OPT(true, true, true, true, true), 'normal'),
  false, 'resource trio rejected even when pairs are allowed');

// On the expansion board the pair rule is always relaxed to pairs, but
// trios stay forbidden regardless of the (hidden) toggle.
assert.strictEqual(ENGINE.validate(resPair, chainAdj, OPT(true, true, true, false, true), 'expanded'),
  true, 'expansion always allows resource pairs');
assert.strictEqual(ENGINE.validate(resTrio, chainAdj, OPT(true, true, true, true, true), 'expanded'),
  false, 'expansion still rejects resource trios');

// --- strong point combos ------------------------------------------------
// Hand-built point groups exercise the pip-sum rule in isolation (a point
// here is shared by tiles 0, 1 and 2; groups need not match chainAdj).

function OPTS(allowStrongPoints) {
  return OPT(true, true, true, true, allowStrongPoints);
}

var strongGroup = [[0, 1, 2]];

// 6 + 5 + 9 = 13 pips at one point: rejected unless the toggle allows it.
var combo659 = [makeTile(6, 'ore'), makeTile(5, 'brick'), makeTile(9, 'sheep'), makeTile(3, 'wheat')];
assert.strictEqual(ENGINE.validate(combo659, chainAdj, OPTS(false), 'normal', strongGroup),
  false, '6/5/9 sharing a point rejected');
assert.strictEqual(ENGINE.validate(combo659, chainAdj, OPTS(true), 'normal', strongGroup),
  true, '6/5/9 sharing a point allowed when toggle on');

// 8 + 5 + 9 = 13 pips.
var combo859 = [makeTile(8, 'ore'), makeTile(5, 'brick'), makeTile(9, 'sheep'), makeTile(3, 'wheat')];
assert.strictEqual(ENGINE.validate(combo859, chainAdj, OPTS(false), 'normal', strongGroup),
  false, '8/5/9 sharing a point rejected');
assert.strictEqual(ENGINE.validate(combo859, chainAdj, OPTS(true), 'normal', strongGroup),
  true, '8/5/9 sharing a point allowed when toggle on');

// 6 + 6 + 8 = 15 pips (6/8 toggle on so only the point rule can reject).
var combo668 = [makeTile(6, 'ore'), makeTile(6, 'brick'), makeTile(8, 'sheep'), makeTile(3, 'wheat')];
assert.strictEqual(ENGINE.validate(combo668, chainAdj, OPTS(false), 'normal', strongGroup),
  false, '6/6/8 sharing a point rejected');
assert.strictEqual(ENGINE.validate(combo668, chainAdj, OPTS(true), 'normal', strongGroup),
  true, '6/6/8 sharing a point allowed when toggle on');

// 8 + 8 + 6 = 15 pips.
var combo886 = [makeTile(8, 'ore'), makeTile(8, 'brick'), makeTile(6, 'sheep'), makeTile(3, 'wheat')];
assert.strictEqual(ENGINE.validate(combo886, chainAdj, OPTS(false), 'normal', strongGroup),
  false, '8/8/6 sharing a point rejected');
assert.strictEqual(ENGINE.validate(combo886, chainAdj, OPTS(true), 'normal', strongGroup),
  true, '8/8/6 sharing a point allowed when toggle on');

// 12 pips is still balanced: 5 + 9 + 9 passes with the rule on.
var combo599 = [makeTile(5, 'ore'), makeTile(9, 'brick'), makeTile(9, 'sheep'), makeTile(3, 'wheat')];
assert.strictEqual(ENGINE.validate(combo599, chainAdj, OPTS(false), 'normal', strongGroup),
  true, '5/9/9 sharing a point (12 pips) allowed');

// A desert contributes no pips at a shared point.
var comboDesert = [makeTile(6, 'ore'), makeTile('', 'desert'), makeTile(5, 'sheep'), makeTile(3, 'wheat')];
assert.strictEqual(ENGINE.validate(comboDesert, chainAdj, OPTS(false), 'normal', strongGroup),
  true, 'desert at the point keeps 6/5 balanced');

// Two tiles can never make a strong point (best pair is 10 pips).
var pairPoint = [[0, 1]];
var combo68Pair = [makeTile(6, 'ore'), makeTile(8, 'brick'), makeTile(3, 'sheep'), makeTile(9, 'wheat')];
assert.strictEqual(ENGINE.validate(combo68Pair, chainAdj, OPTS(false), 'normal', pairPoint),
  true, '6/8 pair point is never strong by itself');

console.log('All engine tests passed.');
