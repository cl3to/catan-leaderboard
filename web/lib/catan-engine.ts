/* Catan board generator engine — port of catan-board-generator/js/engine.js.
 * Pure logic only (no DOM): board geometry, adjacency, tile generation
 * and house-rule validation. */

export type Resource = 'wood' | 'sheep' | 'wheat' | 'brick' | 'ore' | 'desert';

export interface Tile {
  chit: number | '';
  resource: Resource;
  dots: string;
}

interface BoardConfig {
  mode: 'normal' | 'expanded';
  rows: number[];
  tilePct: number;
  rowStepFactor: number;
  cellStepFactor: number;
  rotated: boolean;
  numbers: number[];
  resources: Resource[];
  deserts: number;
  hasFrame: boolean;
}

export interface GenerationOptions {
  allow68: boolean;
  allow212: boolean;
  allowSameNumbers: boolean;
  allowSameResource: boolean;
  allowStrongPoints: boolean;
}

// Probability pips per number token (standard Catan dot counts).
export const DOTS: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

// Numbers governed by the "same numbers can touch" toggle.
// 2/12 and 6/8 have their own dedicated toggles.
const REGULAR_NUMBERS = [3, 4, 5, 9, 10, 11];

// A board point (corner shared by up to three tiles) is "strong" when the
// probability pips of the numbers meeting there total more than this.
const MAX_POINT_PIPS = 12;

export const CLASSIC: BoardConfig = {
  mode: 'normal',
  rows: [3, 4, 5, 4, 3],
  tilePct: 17.5,
  rowStepFactor: 0.73,
  cellStepFactor: 0.99 * 0.866,
  rotated: false,
  numbers: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  resources: [
    'ore', 'ore', 'ore',
    'brick', 'brick', 'brick',
    'sheep', 'sheep', 'sheep', 'sheep',
    'wood', 'wood', 'wood', 'wood',
    'wheat', 'wheat', 'wheat', 'wheat',
  ],
  deserts: 1,
  hasFrame: true,
};

export const EXPANSION: BoardConfig = {
  mode: 'expanded',
  rows: [1, 2, 3, 4, 3, 4, 3, 4, 3, 2, 1],
  tilePct: 16,
  rowStepFactor: 0.866 / 1.99,
  cellStepFactor: 1.51 * 0.99,
  rotated: true,
  numbers: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
  resources: [
    'ore', 'ore', 'ore', 'ore', 'ore',
    'brick', 'brick', 'brick', 'brick', 'brick',
    'sheep', 'sheep', 'sheep', 'sheep', 'sheep', 'sheep',
    'wood', 'wood', 'wood', 'wood', 'wood', 'wood',
    'wheat', 'wheat', 'wheat', 'wheat', 'wheat', 'wheat',
  ],
  deserts: 2,
  hasFrame: false,
};

// Fisher-Yates, in place. An optional rng (returning [0, 1)) makes
// generation reproducible; defaults to Math.random.
function shuffle<T>(list: T[], rng?: () => number): T[] {
  const rand = rng || Math.random;
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

// Tile center positions as % of the square board container.
export function computePositions(cfg: BoardConfig): Array<{ x: number; y: number }> {
  const centerRow = Math.floor(cfg.rows.length / 2);
  const cellStep = cfg.cellStepFactor * cfg.tilePct;
  const rowStep = cfg.rowStepFactor * cfg.tilePct;
  const positions: Array<{ x: number; y: number }> = [];
  cfg.rows.forEach((len, row) => {
    const y = 50 + (row - centerRow) * rowStep;
    const evenShift = ((row % 2) * cellStep) / 2;
    const firstX = 50 - Math.floor(len / 2) * cellStep;
    for (let i = 0; i < len; i++) {
      positions.push({ x: firstX + evenShift + i * cellStep, y });
    }
  });
  return positions;
}

/* Adjacency derived from geometry: two tiles are neighbors when their
 * centers sit at the grid's minimum hex-to-hex distance. */
export function computeAdjacency(cfg: BoardConfig): number[][] {
  const positions = computePositions(cfg);
  const count = positions.length;
  const pairs: Array<{ a: number; b: number; d: number }> = [];
  let minDistance = Infinity;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      pairs.push({ a: i, b: j, d });
      if (d < minDistance) minDistance = d;
    }
  }
  const threshold = minDistance * 1.05;
  const adjacency: number[][] = [];
  for (let t = 0; t < count; t++) adjacency.push([]);
  pairs.forEach((pair) => {
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
function cornerOffsets(cfg: BoardConfig): Array<{ x: number; y: number }> {
  const h = cfg.tilePct;
  const w = h * 0.866;
  if (!cfg.rotated) {
    return [
      { x: 0, y: -h / 2 }, { x: w / 2, y: -h / 4 }, { x: w / 2, y: h / 4 },
      { x: 0, y: h / 2 }, { x: -w / 2, y: h / 4 }, { x: -w / 2, y: -h / 4 },
    ];
  }
  return [
    { x: h / 2, y: 0 }, { x: h / 4, y: w / 2 }, { x: -h / 4, y: w / 2 },
    { x: -h / 2, y: 0 }, { x: -h / 4, y: -w / 2 }, { x: h / 4, y: -w / 2 },
  ];
}

/* Groups of tiles sharing each board point (vertex). */
export function computePointGroups(cfg: BoardConfig): number[][] {
  const positions = computePositions(cfg);
  const offsets = cornerOffsets(cfg);
  const points: Array<{ tile: number; x: number; y: number }> = [];
  positions.forEach((pos, tile) => {
    offsets.forEach((o) => {
      points.push({ tile, x: pos.x + o.x, y: pos.y + o.y });
    });
  });
  const tolerance = cfg.tilePct * 0.15;
  const clusters: Array<Array<{ tile: number; x: number; y: number }>> = [];
  points.forEach((p) => {
    for (let c = 0; c < clusters.length; c++) {
      const rep = clusters[c][0];
      if (Math.abs(rep.x - p.x) <= tolerance && Math.abs(rep.y - p.y) <= tolerance) {
        clusters[c].push(p);
        return;
      }
    }
    clusters.push([p]);
  });
  return clusters.map((cluster) => {
    const tiles: number[] = [];
    cluster.forEach((p) => {
      if (!tiles.includes(p.tile)) tiles.push(p.tile);
    });
    return tiles;
  });
}

function dotString(count: number): string {
  let out = '';
  for (let i = 0; i < count; i++) out += '.';
  return out;
}

// Shuffle number tokens and terrain independently, pair by index,
// then append the deserts and shuffle everything (like the original site).
function generateTiles(cfg: BoardConfig, rng?: () => number): Tile[] {
  const numbers = shuffle(cfg.numbers.slice(), rng);
  const resources = shuffle(cfg.resources.slice(), rng);
  const tiles: Tile[] = numbers.map((chit, index) => ({
    chit,
    resource: resources[index],
    dots: dotString(DOTS[chit]),
  }));
  for (let d = 0; d < cfg.deserts; d++) {
    tiles.push({ chit: '', resource: 'desert', dots: '' });
  }
  return shuffle(tiles, rng);
}

function hasAdjacentPair(tiles: Tile[], adjacency: number[][], matches: (t: Tile) => boolean): boolean {
  for (let i = 0; i < tiles.length; i++) {
    if (!matches(tiles[i])) continue;
    const neighbors = adjacency[i];
    for (const j of neighbors) {
      if (j > i && matches(tiles[j])) return true;
    }
  }
  return false;
}

export function validate(
  tiles: Tile[],
  adjacency: number[][],
  options: GenerationOptions,
  mode: string,
  pointGroups?: number[][],
): boolean {
  if (!options.allow68 && hasAdjacentPair(tiles, adjacency, (t) => t.chit === 6 || t.chit === 8)) return false;

  if (!options.allow212 && hasAdjacentPair(tiles, adjacency, (t) => t.chit === 2 || t.chit === 12)) return false;

  if (!options.allowSameNumbers) {
    for (const n of REGULAR_NUMBERS) {
      if (hasAdjacentPair(tiles, adjacency, (t) => t.chit === n)) return false;
    }
  }

  // Balance rule: no point may gather a strong combination of numbers.
  if (!options.allowStrongPoints && pointGroups) {
    for (const group of pointGroups) {
      let pips = 0;
      for (const t of group) {
        const chit = tiles[t].chit;
        pips += typeof chit === 'number' ? DOTS[chit] || 0 : 0;
      }
      if (pips > MAX_POINT_PIPS) return false;
    }
  }

  // Classic: pairs allowed when the toggle is on, otherwise no two same
  // terrains may touch. Expansion always allows pairs (toggle is hidden).
  const maxGroup = options.allowSameResource || mode !== 'normal' ? 2 : 1;
  for (let i = 0; i < tiles.length; i++) {
    let sameCount = 1;
    const neighbors = adjacency[i];
    for (const k of neighbors) {
      if (tiles[k].resource === tiles[i].resource) sameCount++;
    }
    if (sameCount > maxGroup) return false;
  }
  return true;
}

const MAX_ATTEMPTS = 500000;

// Retry until the shuffle satisfies every enabled rule. The cap guards the
// strictest combos and guarantees termination.
export function generateValidBoard(
  cfg: BoardConfig,
  adjacency: number[][],
  options: GenerationOptions,
  rng?: () => number,
  pointGroups?: number[][],
): Tile[] {
  const points = pointGroups || computePointGroups(cfg);
  let candidate = generateTiles(cfg, rng);
  let attempts = 0;
  while (!validate(candidate, adjacency, options, cfg.mode, points)) {
    candidate = generateTiles(cfg, rng);
    if (++attempts >= MAX_ATTEMPTS) break;
  }
  return candidate;
}
