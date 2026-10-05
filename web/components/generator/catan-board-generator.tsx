'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dices, Maximize2, Minus, Plus, RotateCcw, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CLASSIC,
  EXPANSION,
  computeAdjacency,
  computePointGroups,
  computePositions,
  generateValidBoard,
  type GenerationOptions,
  type Tile,
} from '@/lib/catan-engine';

// Hand-drawn SVG art for the "Classic" theme (one original motif per terrain).

// One wheat ear: stem, layered grain, awns and leaves.
const WHEAT_EAR = `<g>
  <line x1="0" y1="0" x2="0" y2="-42" stroke="#b98f1d" stroke-width="2"/>
  <g fill="#d9a92c">
    <ellipse cx="0" cy="-45" rx="2.6" ry="5"/>
    <ellipse cx="-3.6" cy="-39" rx="2.4" ry="4.4" transform="rotate(-26 -3.6 -39)"/>
    <ellipse cx="3.6" cy="-39" rx="2.4" ry="4.4" transform="rotate(26 3.6 -39)"/>
    <ellipse cx="-3.4" cy="-32" rx="2.2" ry="4" transform="rotate(-24 -3.4 -32)"/>
    <ellipse cx="3.4" cy="-32" rx="2.2" ry="4" transform="rotate(24 3.4 -32)"/>
  </g>
  <g stroke="#c9a626" stroke-width="1">
    <line x1="0" y1="-48" x2="-4" y2="-59"/>
    <line x1="0" y1="-48" x2="4" y2="-59"/>
    <line x1="0" y1="-48" x2="0" y2="-61"/>
  </g>
  <path d="M0,-10 Q-8,-16 -10,-26" stroke="#a8871c" stroke-width="2" fill="none"/>
  <path d="M0,-6 Q8,-12 10,-22" stroke="#a8871c" stroke-width="2" fill="none"/>
</g>`;

// Bundled sheaf of stalks with grain heads poking out.
const WHEAT_SHEAF = `<g>
  <path d="M-10,0 L-6.5,-20 L6.5,-20 L10,0 Z" fill="#d9a92c"/>
  <g stroke="#b98f1d" stroke-width="1.4">
    <line x1="-5" y1="-2" x2="-3.8" y2="-18"/>
    <line x1="0" y1="-2" x2="0" y2="-19"/>
    <line x1="5" y1="-2" x2="3.8" y2="-18"/>
  </g>
  <rect x="-7" y="-11" width="14" height="3.6" rx="1" fill="#b98f1d"/>
  <g fill="#d9a92c">
    <ellipse cx="-4.5" cy="-22.5" rx="2.2" ry="3.8"/>
    <ellipse cx="0" cy="-23.5" rx="2.2" ry="3.8"/>
    <ellipse cx="4.5" cy="-22.5" rx="2.2" ry="3.8"/>
  </g>
</g>`;

// Golden field with ears around the edges and sheaves at the front; the
// middle stays sparse so the number chit stays readable on top of it.
const WHEAT_ART = `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
  <rect width="100" height="115" fill="#eac83e"/>
  <g fill="#dcb62e" opacity="0.5">
    <rect x="0" width="12" height="115"/>
    <rect x="26" width="12" height="115"/>
    <rect x="52" width="12" height="115"/>
    <rect x="78" width="12" height="115"/>
  </g>
  <path d="M0,96 Q25,90 50,96 T100,96 L100,115 L0,115 Z" fill="#d4ad28"/>
  <path d="M0,107 Q25,102 50,107 T100,107 L100,115 L0,115 Z" fill="#c49c22"/>
  ${[[50, 36, 0.62, 0], [19, 44, 0.78, -8], [81, 44, 0.78, 8], [9, 80, 1, 0], [91, 80, 1, 0], [5, 58, 0.95, 0], [95, 58, 0.95, 0], [40, 115, 0.5, 0], [60, 115, 0.5, 0]]
    .map(([x, y, s, r]) => `<g transform="translate(${x},${y}) rotate(${r}) scale(${s})">${WHEAT_EAR}</g>`)
    .join('')}
  <g transform="translate(24,111)">${WHEAT_SHEAF}</g>
  <g transform="translate(76,111)">${WHEAT_SHEAF}</g>
</svg>`;

// Pine: trunk plus three shaded tiers of needles.
const WOOD_PINE = `<g>
  <rect x="-2.2" y="-6" width="4.4" height="8" rx="1.2" fill="#7a4a24"/>
  <polygon points="0,-24 13,-6 -13,-6" fill="#2f6b33"/>
  <polygon points="0,-24 13,-6 4,-6" fill="#397a3b"/>
  <polygon points="0,-33 9.5,-17 -9.5,-17" fill="#357a39"/>
  <polygon points="0,-33 9.5,-17 3,-17" fill="#3d8442"/>
  <polygon points="0,-40 6,-29 -6,-29" fill="#3d8442"/>
  <polygon points="0,-40 6,-29 2,-29" fill="#4a9149"/>
</g>`;

// Round deciduous tree: trunk under a clustered canopy with a highlight.
const WOOD_BUSH = `<g>
  <rect x="-2" y="-6" width="4" height="8" rx="1" fill="#7a4a24"/>
  <circle cx="0" cy="-16" r="9" fill="#3d8442"/>
  <circle cx="-7.5" cy="-11" r="6.5" fill="#357a39"/>
  <circle cx="7.5" cy="-11" r="6.5" fill="#357a39"/>
  <circle cx="0" cy="-22" r="6.5" fill="#468d45"/>
  <circle cx="-3" cy="-15" r="4" fill="#55a057"/>
</g>`;

// Dense forest: layered groves in the background, pines and round trees
// around the tile with a grass clearing at the front.
const WOOD_ART = `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
  <rect width="100" height="115" fill="#86b25c"/>
  <ellipse cx="50" cy="26" rx="56" ry="26" fill="#6fa052" opacity="0.55"/>
  <ellipse cx="16" cy="56" rx="44" ry="18" fill="#74a655" opacity="0.5"/>
  <ellipse cx="84" cy="56" rx="44" ry="18" fill="#74a655" opacity="0.5"/>
  <path d="M0,92 Q25,86 50,92 T100,92 L100,115 L0,115 Z" fill="#a8c47a"/>
  <path d="M0,104 Q25,99 50,104 T100,104 L100,115 L0,115 Z" fill="#97b468"/>
  ${[[15, 90, 1], [37, 97, 0.72], [63, 97, 0.78], [85, 90, 1], [33, 46, 0.62], [67, 46, 0.62], [50, 32, 0.55]]
    .map(([x, y, s]) => `<g transform="translate(${x},${y}) scale(${s})">${WOOD_PINE}</g>`)
    .join('')}
  ${[[8, 66, 0.85], [92, 66, 0.85], [50, 112, 0.9]]
    .map(([x, y, s]) => `<g transform="translate(${x},${y}) scale(${s})">${WOOD_BUSH}</g>`)
    .join('')}
</svg>`;

// Ewe: fluffy wool body built from circles, dark head with ear, legs, tail.
const SHEEP_EWE = `<g>
  <rect x="-6.5" y="-2" width="2.6" height="7" rx="1" fill="#4a4a4a"/>
  <rect x="3.9" y="-2" width="2.6" height="7" rx="1" fill="#4a4a4a"/>
  <circle cx="0" cy="-11" r="9.5" fill="#f7f4ec"/>
  <circle cx="-7" cy="-7" r="6.5" fill="#f7f4ec"/>
  <circle cx="7" cy="-7" r="6.5" fill="#f7f4ec"/>
  <circle cx="-4" cy="-16" r="5.5" fill="#f7f4ec"/>
  <circle cx="4" cy="-16" r="5.5" fill="#f7f4ec"/>
  <circle cx="-10.5" cy="-13" r="3.2" fill="#f7f4ec"/>
  <circle cx="11.5" cy="-9" r="4.6" fill="#3d3d3d"/>
  <polygon points="12.5,-13 17.5,-17 15.5,-8.5" fill="#3d3d3d"/>
</g>`;

// Small tuft of grass blades.
const SHEEP_TUFT = `<g stroke="#7fa052" stroke-width="1.6" fill="none" stroke-linecap="round">
  <line x1="0" y1="0" x2="-3" y2="-6"/>
  <line x1="0" y1="0" x2="0" y2="-7.5"/>
  <line x1="0" y1="0" x2="3" y2="-6"/>
</g>`;

// Pasture: scattered grazing sheep (some mirrored) and grass tufts.
const SHEEP_ART = `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
  <rect width="100" height="115" fill="#a5c86a"/>
  <path d="M0,100 Q25,94 50,100 T100,100 L100,115 L0,115 Z" fill="#98bc5c"/>
  ${[[45, 96, 1], [55, 101, 0.8], [15, 82, 1.1], [85, 82, 1], [36, 28, 0.9], [64, 30, 0.8], [27, 50, 0.9], [73, 52, 0.85]]
    .map(([x, y, s]) => `<g transform="translate(${x},${y}) scale(${s})">${SHEEP_TUFT}</g>`)
    .join('')}
  ${[[22, 106, 1, 1], [78, 106, 1, -1], [9, 62, 0.72, 1], [91, 62, 0.72, -1], [50, 36, 0.6, 1]]
    .map(([x, y, s, m]) => `<g transform="translate(${x},${y}) scale(${m * s},${s})">${SHEEP_EWE}</g>`)
    .join('')}
</svg>`;

// Brick tones cycled per brick so the wall reads as hand-laid clay.
const BRICK_FILLS = ['#b95c39', '#c06a45', '#ab4f30', '#b25335', '#a3462b'];
const BRICK_ART = `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
  <rect width="100" height="115" fill="#8a3f26"/>
  ${Array.from({ length: 9 }, (_, r) => {
    const y = 2.5 + r * 12.4;
    const off = r % 2 ? 10.5 : 0;
    return Array.from({ length: 6 }, (_, i) => {
      const x = off - 10.5 + i * 21;
      const fill = BRICK_FILLS[(r * 3 + i) % BRICK_FILLS.length];
      return `<rect x="${x}" y="${y}" width="19" height="10.4" rx="1" fill="${fill}" stroke="#7d3620" stroke-width="0.8"/>`;
    }).join('');
  }).join('')}
  <rect width="100" height="115" fill="#f2e3bd" opacity="0.08"/>
</svg>`;

// Mountain: faceted slopes with a snow cap.
const ORE_PEAK = `<g>
  <polygon points="-30,0 0,-48 30,0" fill="#6d7683"/>
  <polygon points="0,-48 30,0 6,0" fill="#7d8794"/>
  <polygon points="-30,0 0,-48 -5,0" fill="#5d6572"/>
  <polygon points="0,-48 8,-35 -8,-35" fill="#edf1f4"/>
  <polygon points="0,-48 4,-40 -4,-40" fill="#f7fafc"/>
</g>`;

// Scree boulder cluster at the mountain foot.
const ORE_ROCK = `<g>
  <polygon points="-8,3 -5,-4 2,-6 8,-1 7,3" fill="#7d8794"/>
  <polygon points="-5,-4 2,-6 1,3 -4,3" fill="#8d96a1"/>
</g>`;

// Range: faceted peaks around the tile with scree at the front.
const ORE_ART = `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
  <rect width="100" height="115" fill="#9aa3ad"/>
  <rect width="100" height="38" fill="#b3bac3" opacity="0.55"/>
  ${[[22, 88, 0.95, 1], [78, 88, 0.85, -1], [50, 115, 0.5, 1], [50, 48, 0.55, -1]]
    .map(([x, y, s, m]) => `<g transform="translate(${x},${y}) scale(${m * s},${s})">${ORE_PEAK}</g>`)
    .join('')}
  ${[[12, 108, 1], [88, 108, 1], [33, 112, 0.65], [67, 112, 0.65]]
    .map(([x, y, s]) => `<g transform="translate(${x},${y}) scale(${s})">${ORE_ROCK}</g>`)
    .join('')}
</svg>`;

// Gnarled dead tree with bare branches.
const DESERT_TREE = `<g stroke="#8a6f43" fill="none" stroke-linecap="round">
  <path d="M0,0 L0,-14" stroke-width="3.2"/>
  <path d="M0,-8 L-7,-16" stroke-width="2.2"/>
  <path d="M0,-11 L6,-19" stroke-width="2.2"/>
  <path d="M-4,-12 L-10,-14" stroke-width="1.6"/>
  <path d="M3,-15 L9,-23" stroke-width="1.6"/>
</g>`;

// Weathered rock cluster.
const DESERT_ROCK = `<g>
  <polygon points="-7,2 -4,-4 3,-5 8,0 6,2" fill="#b0a78f"/>
  <polygon points="-4,-4 3,-5 2,1 -3,1" fill="#c2b99c"/>
</g>`;

// Barren dunes: layered ridges with light crests, dead trees and rocks.
const DESERT_ART = `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
  <rect width="100" height="115" fill="#ecd39f"/>
  <rect width="100" height="30" fill="#f2e0b4" opacity="0.55"/>
  <path d="M0,58 C20,48 40,58 55,52 C75,44 90,55 100,50 L100,115 L0,115 Z" fill="#e3c58c"/>
  <path d="M0,58 C20,48 40,58 55,52 C75,44 90,55 100,50" stroke="#f2e0b4" stroke-width="2.2" fill="none"/>
  <path d="M0,78 C25,70 45,80 65,74 C82,69 95,78 100,74 L100,115 L0,115 Z" fill="#d9b97e"/>
  <path d="M0,78 C25,70 45,80 65,74 C82,69 95,78 100,74" stroke="#e8cd97" stroke-width="2" fill="none"/>
  <path d="M0,96 Q25,90 50,96 T100,96 L100,115 L0,115 Z" fill="#cfa96e"/>
  <g transform="translate(24,58)">${DESERT_TREE}</g>
  <g transform="translate(80,63) scale(-0.85,0.85)">${DESERT_TREE}</g>
  <g transform="translate(12,44)">${DESERT_ROCK}</g>
  <g transform="translate(88,88)">${DESERT_ROCK}</g>
</svg>`;

const ART: Record<string, string> = {
  wood: WOOD_ART,
  sheep: SHEEP_ART,
  wheat: WHEAT_ART,
  brick: BRICK_ART,
  ore: ORE_ART,
  desert: DESERT_ART,
};

type MapMode = 'classic' | 'expansion';
type ArtTheme = 'classic' | 'colorblock' | 'original';
type Point = { x: number; y: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

// Keeps the panned board from drifting away: the board may move only as
// far as its scaled-overhang allows, so its edges never leave the viewport.
const clampPan = (pan: Point, viewport: DOMRect, zoom: number): Point => {
  const maxX = (viewport.width * (zoom - 1)) / 2;
  const maxY = (viewport.height * (zoom - 1)) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
};

function OptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-base/70 px-3.5 py-2.5 text-left transition-colors hover:border-gold/50"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors',
          checked ? 'bg-forest' : 'border border-border bg-surface-overlay'
        )}
      >
        <span
          className={cn(
            'absolute h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[1.375rem]' : 'left-0.5'
          )}
        />
      </span>
    </button>
  );
}

export function CatanBoardGenerator() {
  const [mapMode, setMapMode] = useState<MapMode>('classic');
  const [artTheme, setArtTheme] = useState<ArtTheme>('original');
  const [options, setOptions] = useState<GenerationOptions>({
    allow68: false,
    allow212: true,
    allowSameNumbers: true,
    allowSameResource: true,
    allowStrongPoints: false,
  });
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const boardCardRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const gestureRef = useRef<{ pointers: Map<number, Point>; lastDist: number }>({
    pointers: new Map(),
    lastDist: 0,
  });

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === boardCardRef.current;
      setIsFullscreen(active);
      if (!active) {
        zoomRef.current = 1;
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const applyZoom = useCallback((next: number) => {
    const clamped = clampZoom(next);
    zoomRef.current = clamped;
    setZoom(clamped);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (viewport) setPan((prev) => clampPan(prev, viewport, clamped));
  }, []);

  const resetZoom = useCallback(() => {
    zoomRef.current = 1;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Wheel zoom (desktop) — needs a non-passive listener to block scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (!document.fullscreenElement) return;
      event.preventDefault();
      applyZoom(zoomRef.current * Math.exp(-event.deltaY * 0.0015));
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [applyZoom]);

  const onViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isFullscreen || (event.target as Element).closest('button')) return;
    // Blocks text selection while panning/zooming (dragging would otherwise
    // highlight the chit numbers behind the gesture).
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(gestureRef.current.pointers.values());
    gestureRef.current.lastDist =
      points.length >= 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
  };

  const onViewportPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!isFullscreen || !gesture.pointers.has(event.pointerId)) return;
    const previous = gesture.pointers.get(event.pointerId)!;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;

    if (gesture.pointers.size >= 2) {
      // Pinch zoom: scale tracks the change in distance between fingers.
      const points = Array.from(gesture.pointers.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (gesture.lastDist > 0 && dist > 0) {
        applyZoom(zoomRef.current * (dist / gesture.lastDist));
        gesture.lastDist = dist;
      }
    } else if (zoomRef.current > 1) {
      // Single finger (or mouse drag) pans once zoomed in.
      setPan((prev) =>
        clampPan({ x: prev.x + (event.clientX - previous.x), y: prev.y + (event.clientY - previous.y) }, viewport, zoomRef.current)
      );
    }
  };

  const onViewportPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    gestureRef.current.pointers.delete(event.pointerId);
    const points = Array.from(gestureRef.current.pointers.values());
    gestureRef.current.lastDist =
      points.length >= 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
  };

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void boardCardRef.current?.requestFullscreen();
    }
  }, []);

  const cfg = mapMode === 'expansion' ? EXPANSION : CLASSIC;
  const positions = useMemo(() => computePositions(cfg), [cfg]);
  const adjacency = useMemo(() => computeAdjacency(cfg), [cfg]);
  const pointGroups = useMemo(() => computePointGroups(cfg), [cfg]);

  const shuffleBoard = useCallback(() => {
    setTiles(generateValidBoard(cfg, adjacency, options, undefined, pointGroups));
  }, [cfg, adjacency, options, pointGroups]);

  useEffect(() => {
    shuffleBoard();
  }, [shuffleBoard]);

  const setOption = (key: keyof GenerationOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:items-start">
      <section className="catan-panel animate-slide-up p-5">
        <div className="space-y-1 pl-5">
          <span className="catan-label">Regras da Casa</span>
          <h2 className="font-display text-xl text-foreground">Opções de geração</h2>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              Tipo de mapa
            </span>
            <div className="seg-group w-full">
              <button
                type="button"
                className={cn('seg-btn flex-1 justify-center', mapMode === 'classic' && 'seg-btn-active')}
                onClick={() => setMapMode('classic')}
              >
                Clássica
              </button>
              <button
                type="button"
                className={cn('seg-btn flex-1 justify-center', mapMode === 'expansion' && 'seg-btn-active')}
                onClick={() => setMapMode('expansion')}
              >
                Expansão 5–6
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              Estilo visual
            </span>
            <div className="seg-group w-full">
              <button
                type="button"
                className={cn('seg-btn flex-1 justify-center', artTheme === 'classic' && 'seg-btn-active')}
                onClick={() => setArtTheme('classic')}
              >
                Arte
              </button>
              <button
                type="button"
                className={cn('seg-btn flex-1 justify-center', artTheme === 'colorblock' && 'seg-btn-active')}
                onClick={() => setArtTheme('colorblock')}
              >
                Cores
              </button>
              <button
                type="button"
                className={cn('seg-btn flex-1 justify-center', artTheme === 'original' && 'seg-btn-active')}
                onClick={() => setArtTheme('original')}
              >
                Clássico
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              Regras de embaralhamento
            </span>
            <OptionToggle
              label="6 e 8 podem se tocar"
              checked={options.allow68}
              onChange={(v) => setOption('allow68', v)}
            />
            <OptionToggle
              label="2 e 12 podem se tocar"
              checked={options.allow212}
              onChange={(v) => setOption('allow212', v)}
            />
            <OptionToggle
              label="Números iguais podem se tocar"
              checked={options.allowSameNumbers}
              onChange={(v) => setOption('allowSameNumbers', v)}
            />
            <OptionToggle
              label="Combos fortes podem dividir cruzamento"
              checked={options.allowStrongPoints}
              onChange={(v) => setOption('allowStrongPoints', v)}
            />
            {mapMode === 'classic' ? (
              <OptionToggle
                label="Terrenos iguais podem se tocar"
                checked={options.allowSameResource}
                onChange={(v) => setOption('allowSameResource', v)}
              />
            ) : (
              <p className="rounded-xl border border-border/70 bg-surface-base/70 px-3.5 py-2.5 text-xs text-muted-foreground">
                Na expansão, terrenos iguais podem sempre se tocar.
              </p>
            )}
          </div>

          <Button className="w-full" onClick={shuffleBoard}>
            <Dices className="h-4 w-4" />
            Embaralhar tabuleiro
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Cada embaralhada respeita todas as regras ativas acima.
          </p>
        </div>
      </section>

      <section
        ref={boardCardRef}
        className="catan-panel gen-board-card animate-slide-up overflow-hidden p-4 sm:p-6"
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute right-4 top-4 z-10 h-9 gap-1.5 px-3"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Sair da tela cheia' : 'Ver tabuleiro em tela cheia'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Sair' : 'Tela cheia'}</span>
        </Button>
        <div
          ref={viewportRef}
          className={cn('gen-board-viewport', isFullscreen && 'gen-board-viewport-full')}
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={onViewportPointerUp}
          onPointerCancel={onViewportPointerUp}
          onDoubleClick={() => {
            if (isFullscreen) resetZoom();
          }}
          onContextMenu={(event) => {
            if (isFullscreen) event.preventDefault();
          }}
        >
          <div
            className={cn(
              'gen-board mx-auto w-full max-w-[640px]',
              artTheme === 'colorblock'
                ? 'gen-theme-colorblock'
                : artTheme === 'original'
                  ? 'gen-theme-original'
                  : 'gen-theme-classic'
            )}
            style={isFullscreen ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } : undefined}
          >
          {cfg.hasFrame && <div className="gen-frame" />}
          {positions.map((pos, index) => {
            const tile = tiles[index];
            if (!tile) return null;
            const highProb = tile.chit === 6 || tile.chit === 8;
            return (
              <div
                key={index}
                className={cn(
                  'gen-hex',
                  cfg.mode === 'expanded' ? 'gen-hex-expanded' : 'gen-hex-normal',
                  tile.resource,
                  highProb && 'gen-high-prob'
                )}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className="gen-tile-beach" />
                <div className="gen-tile-hex">
                  <div className="gen-tile-art" dangerouslySetInnerHTML={{ __html: ART[tile.resource] }} />
                </div>
                <div className="gen-tile-img" />
                {tile.resource === 'desert' ? (
                  <div className="gen-tile-circle gen-desert-chit" />
                ) : (
                  <div className="gen-tile-circle">
                    <span className="gen-chit-num">{tile.chit}</span>
                    <span className="gen-chit-dots">{tile.dots}</span>
                  </div>
                )}
              </div>
            );
          })}
          </div>
          {isFullscreen && (
            <div className="gen-zoom-controls">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9"
                onClick={() => applyZoom(zoomRef.current / 1.3)}
                aria-label="Reduzir zoom"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 gap-1 px-3 tabular-nums"
                onClick={resetZoom}
                aria-label="Restaurar zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9"
                onClick={() => applyZoom(zoomRef.current * 1.3)}
                aria-label="Aumentar zoom"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
