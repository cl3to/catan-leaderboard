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
const ART: Record<string, string> = {
  wood: `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
    <rect width="100" height="115" fill="#5b9e48"/>
    <polygon points="30,88 42,58 54,88" fill="#2f6b33"/>
    <polygon points="16,66 26,42 36,66" fill="#2f6b33"/>
    <polygon points="62,70 73,44 84,70" fill="#2f6b33"/>
    <polygon points="40,55 47,40 54,55" fill="#357a39"/>
    <rect x="33" y="88" width="5" height="9" fill="#7a4a24"/>
    <rect x="23" y="66" width="4" height="8" fill="#7a4a24"/>
    <rect x="71" y="70" width="4" height="8" fill="#7a4a24"/>
  </svg>`,
  sheep: `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
    <rect width="100" height="115" fill="#a5c86a"/>
    <ellipse cx="34" cy="62" rx="17" ry="12" fill="#f7f4ec"/>
    <circle cx="49" cy="58" r="6" fill="#3d3d3d"/>
    <ellipse cx="66" cy="86" rx="15" ry="11" fill="#f7f4ec"/>
    <circle cx="79" cy="82" r="5.5" fill="#3d3d3d"/>
    <ellipse cx="30" cy="92" rx="13" ry="9" fill="#f7f4ec"/>
    <circle cx="42" cy="89" r="4.5" fill="#3d3d3d"/>
  </svg>`,
  wheat: `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
    <rect width="100" height="115" fill="#ecc441"/>
    <g stroke="#c79a1e" stroke-width="3">
      <line x1="30" y1="104" x2="30" y2="62"/>
      <line x1="50" y1="107" x2="50" y2="55"/>
      <line x1="70" y1="104" x2="70" y2="64"/>
    </g>
    <ellipse cx="30" cy="57" rx="5" ry="10" fill="#d9a92c"/>
    <ellipse cx="50" cy="50" rx="5" ry="10" fill="#d9a92c"/>
    <ellipse cx="70" cy="59" rx="5" ry="10" fill="#d9a92c"/>
  </svg>`,
  brick: `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
    <rect width="100" height="115" fill="#b95c39"/>
    <g fill="#93482c">
      <rect x="4" y="18" width="42" height="15"/>
      <rect x="52" y="18" width="42" height="15"/>
      <rect x="-20" y="38" width="42" height="15"/>
      <rect x="28" y="38" width="42" height="15"/>
      <rect x="76" y="38" width="42" height="15"/>
      <rect x="4" y="58" width="42" height="15"/>
      <rect x="52" y="58" width="42" height="15"/>
      <rect x="-20" y="78" width="42" height="15"/>
      <rect x="28" y="78" width="42" height="15"/>
      <rect x="76" y="78" width="42" height="15"/>
      <rect x="4" y="98" width="42" height="15"/>
      <rect x="52" y="98" width="42" height="15"/>
    </g>
  </svg>`,
  ore: `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
    <rect width="100" height="115" fill="#9aa3ad"/>
    <polygon points="6,84 34,38 62,84" fill="#5d6572"/>
    <polygon points="34,38 43,54 25,54" fill="#edf1f4"/>
    <polygon points="44,92 72,48 100,92" fill="#6d7683"/>
    <polygon points="72,48 80,62 64,62" fill="#edf1f4"/>
    <polygon points="-10,96 12,58 34,96" fill="#525a66"/>
    <polygon points="12,58 19,70 5,70" fill="#edf1f4"/>
  </svg>`,
  desert: `<svg viewBox="0 0 100 115" preserveAspectRatio="none">
    <rect width="100" height="115" fill="#ecd39f"/>
    <circle cx="74" cy="30" r="9" fill="#f7e6b4"/>
    <path d="M0,72 Q25,60 50,72 T100,72 L100,115 L0,115 Z" fill="#ddbc7e"/>
    <path d="M0,92 Q25,82 50,92 T100,92 L100,115 L0,115 Z" fill="#cfa76a"/>
  </svg>`,
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
