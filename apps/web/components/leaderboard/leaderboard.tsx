'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trophy, Medal, Award, Users, Flame, Pickaxe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  userId: string;
  nickname: string;
  fullName: string;
  category: 'graduacao' | 'pos';
  avatarUrl: string | null;
  avatarKey: string | null;
  avatarMode: string;
  totalPoints: number;
  wins: number;
  matches: number;
  winRate: number;
  rank: number;
}

const categoryLabels = {
  all: 'Todas as frentes',
  graduacao: 'Graduacao',
  pos: 'Pos-graduacao',
};

const timeRangeLabels = {
  all: 'Desde fundacao',
  week: 'Ultimos 7 dias',
  month: 'Ultimos 30 dias',
  year: 'Temporada atual',
};

const sortLabels = {
  wins: 'Vitorias',
  points: 'Pontos',
  winRate: 'Taxa de vitoria',
  matches: 'Partidas',
};

const avatarPalette = [
  'linear-gradient(140deg, #b44f26 15%, #7f3513 85%)',
  'linear-gradient(140deg, #5f774f 15%, #2f4f34 85%)',
  'linear-gradient(140deg, #6d7e90 15%, #3f4b5e 85%)',
  'linear-gradient(140deg, #c58b2b 15%, #8f6113 85%)',
  'linear-gradient(140deg, #7f4855 15%, #5a2b36 85%)',
  'linear-gradient(140deg, #2e7397 15%, #145172 85%)',
];

const getAvatarBackground = (nickname: string) => {
  const score = nickname
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarPalette[score % avatarPalette.length];
};

const rankStyles: Record<number, string> = {
  1: 'from-[#f2b941] to-[#d88f1f] text-[#3c2a0a]',
  2: 'from-[#cfd6e1] to-[#99a7bd] text-[#243248]',
  3: 'from-[#d79d62] to-[#ae6836] text-[#40240f]',
};

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <div className="hex-badge !h-10 !w-10 !px-0 bg-gradient-to-br from-[#f2b941] to-[#d88f1f] !text-[#3c2a0a] shadow-lg shadow-[#f2b941]/35">
        <Trophy className="h-4 w-4" />
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="hex-badge !h-10 !w-10 !px-0 bg-gradient-to-br from-[#cfd6e1] to-[#99a7bd] !text-[#243248] shadow-lg shadow-[#b7c2d3]/35">
        <Medal className="h-4 w-4" />
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="hex-badge !h-10 !w-10 !px-0 bg-gradient-to-br from-[#d79d62] to-[#ae6836] !text-[#40240f] shadow-lg shadow-[#b07646]/35">
        <Award className="h-4 w-4" />
      </div>
    );
  }

  return <div className="hex-badge !h-10 !w-10 !px-0">{rank}</div>;
};

const avatarPresets: Record<string, { icon: string; color: string }> = {
  wood: { icon: '🪵', color: '#8B4513' },
  brick: { icon: '🧱', color: '#B22222' },
  sheep: { icon: '🐑', color: '#90EE90' },
  wheat: { icon: '🌾', color: '#FFD700' },
  ore: { icon: '🪨', color: '#696969' },
  desert: { icon: '🏜️', color: '#F4A460' },
  settlement: { icon: '🏠', color: '#4A90D9' },
  city: { icon: '🏰', color: '#9B59B6' },
  road: { icon: '🛤️', color: '#8B4513' },
  robber: { icon: '🏴', color: '#2C3E50' },
  dice: { icon: '🎲', color: '#E74C3C' },
  port: { icon: '⚓', color: '#3498DB' },
  knight: { icon: '🛡️', color: '#95A5A6' },
  vp: { icon: '⭐', color: '#F1C40F' },
  trade: { icon: '⚖️', color: '#1ABC9C' },
};

const Avatar = ({ entry }: { entry: LeaderboardEntry }) => {
  const preset = entry.avatarMode === 'preset' && entry.avatarKey ? avatarPresets[entry.avatarKey] : null;
  const initial = entry.nickname.charAt(0).toUpperCase();

  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt={`Avatar de ${entry.nickname}`}
        className="h-12 w-12 rounded-2xl border border-white/35 object-cover"
      />
    );
  }

  if (preset) {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/35 text-xl shadow-md"
        style={{ background: preset.color + '30' }}
        aria-label={`Avatar de ${entry.nickname}`}
      >
        {preset.icon}
      </div>
    );
  }

  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/35 text-lg font-bold text-white shadow-md"
      style={{ background: getAvatarBackground(entry.nickname) }}
      aria-label={`Avatar de ${entry.nickname}`}
    >
      {initial}
    </div>
  );
};

type Category = 'all' | 'graduacao' | 'pos';
type TimeRange = 'all' | 'week' | 'month' | 'year';
type SortBy = 'wins' | 'points' | 'winRate' | 'matches';

export function Leaderboard() {
  const [category, setCategory] = useState<Category>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('wins');

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', category, timeRange, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (timeRange !== 'all') params.set('timeRange', timeRange);
      params.set('sortBy', sortBy);

      const res = await fetch(`/api/v1/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json() as Promise<LeaderboardEntry[]>;
    },
  });

  const stats = useMemo(() => {
    const entries = leaderboard ?? [];
    const totalPlayers = entries.length;
    const totalMatches = entries.reduce((acc, entry) => acc + entry.matches, 0);
    const avgPoints =
      totalPlayers === 0 ? 0 : Math.round((entries.reduce((acc, entry) => acc + entry.totalPoints, 0) / totalPlayers) * 10) / 10;
    const topWins = entries.reduce((acc, entry) => Math.max(acc, entry.wins), 0);
    const avgWinRate =
      totalPlayers === 0 ? 0 : Math.round(entries.reduce((acc, entry) => acc + entry.winRate, 0) / totalPlayers);

    return {
      totalPlayers,
      totalMatches,
      avgPoints,
      topWins,
      avgWinRate,
      undergrad: entries.filter((e) => e.category === 'graduacao').length,
      postgrad: entries.filter((e) => e.category === 'pos').length,
    };
  }, [leaderboard]);

  const topThree = (leaderboard ?? []).slice(0, 3);

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="catan-panel border-[1.5px]">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="terrain-chip">Mosaico de recursos</span>
            <span className="terrain-chip">Partidas validadas</span>
            <span className="terrain-chip">Atualizacao em tempo real</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Frente academica
              </label>
              <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
                <SelectTrigger className="h-11 rounded-2xl border-border/80 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/80 bg-card">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Janela historica
              </label>
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="h-11 rounded-2xl border-border/80 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/80 bg-card">
                  {Object.entries(timeRangeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Ordenar por
              </label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger className="h-11 rounded-2xl border-border/80 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/80 bg-card">
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Catanistas</p>
            <p className="mt-1 text-2xl font-bold text-catan-wood">{stats.totalPlayers}</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Vitorias</p>
            <p className="mt-1 text-2xl font-bold text-catan-brick">{stats.topWins}</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Taxa vitoria</p>
            <p className="mt-1 text-2xl font-bold text-catan-sheep">{stats.avgWinRate}%</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Partidas</p>
            <p className="mt-1 text-2xl font-bold text-catan-ocean">{stats.totalMatches}</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Media pts</p>
            <p className="mt-1 text-2xl font-bold text-catan-wood">{stats.avgPoints}</p>
          </CardContent>
        </Card>
      </div>

      {topThree.length > 0 && (
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-catan-brick" />
              <h3 className="font-display text-xl text-catan-wood">Podio da Revolucao</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {topThree.map((entry) => (
                <div
                  key={`podium-${entry.userId}`}
                  className={cn(
                    'animate-rise rounded-2xl border border-border/80 bg-background/70 p-3',
                    entry.rank === 1 && 'sm:-translate-y-2'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn('hex-badge', entry.rank <= 3 && `bg-gradient-to-br ${rankStyles[entry.rank]}`)}>
                      {entry.rank}
                    </span>
                    <div>
                      <p className="font-semibold leading-none">{entry.nickname}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {entry.category === 'graduacao' ? 'Graduacao' : 'Pos-graduacao'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-secondary/70 px-2 py-1.5">
                      <p className="text-muted-foreground">WIN</p>
                      <p className="font-bold text-catan-brick">{entry.wins}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/70 px-2 py-1.5">
                      <p className="text-muted-foreground">PTS</p>
                      <p className="font-bold text-catan-wood">{entry.totalPoints}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/70 px-2 py-1.5">
                      <p className="text-muted-foreground">MAT</p>
                      <p className="font-bold text-catan-ocean">{entry.matches}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="catan-panel border-[1.5px]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-secondary/70" />
              ))}
            </div>
          ) : leaderboard?.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center sm:p-10">
              <Pickaxe className="h-9 w-9 text-muted-foreground" />
              <p className="font-display text-xl text-catan-wood">Sem colonos no ranking</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Nenhum jogador corresponde aos filtros escolhidos. Mude categoria ou periodo para explorar outras mesas.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {leaderboard?.map((entry, index) => (
                <li
                  key={entry.userId}
                  className="animate-rise px-3 py-3 transition-colors hover:bg-secondary/45 sm:px-4"
                  style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
                >
                  <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 sm:grid-cols-[auto,1fr,auto,auto,auto] sm:gap-4">
                    <RankBadge rank={entry.rank} />

                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar entry={entry} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{entry.nickname}</p>
                        <p className="truncate text-xs text-muted-foreground">{entry.fullName}</p>
                        <span className="mt-1 inline-flex rounded-full border border-border/70 bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-secondary-foreground sm:hidden">
                          {entry.category === 'graduacao' ? 'Graduacao' : 'Pos-graduacao'}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.11em]',
                          entry.category === 'graduacao'
                            ? 'border-catan-ocean/50 bg-catan-ocean/15 text-catan-ocean'
                            : 'border-catan-sheep/50 bg-catan-sheep/15 text-catan-sheep'
                        )}
                      >
                        {entry.category === 'graduacao' ? 'Graduacao' : 'Pos-graduacao'}
                      </span>
                    </div>

                    <div className="flex grid-cols-2 gap-2 text-center text-[11px] sm:grid-cols-4 sm:flex sm:items-center sm:gap-3 sm:text-xs">
                      <div className="rounded-xl bg-secondary/70 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">WIN</p>
                        <p className="text-sm font-bold text-catan-brick">{entry.wins}</p>
                      </div>
                      <div className="rounded-xl bg-secondary/70 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">PTS</p>
                        <p className="text-sm font-bold text-catan-wood">{entry.totalPoints}</p>
                      </div>
                      <div className="rounded-xl bg-secondary/70 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">MAT</p>
                        <p className="text-sm font-bold text-catan-ocean">{entry.matches}</p>
                      </div>
                      <div className="rounded-xl bg-secondary/70 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">%</p>
                        <p className="text-sm font-bold text-catan-sheep">{entry.winRate}%</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Graduacao</p>
              <p className="mt-1 text-2xl font-bold text-catan-ocean">{stats.undergrad}</p>
            </div>
            <div className="hex-badge !h-9 !w-9 !px-0 bg-gradient-to-br from-catan-ocean to-catan-ore text-white">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="catan-panel border-[1.5px]">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Pos-graduacao</p>
              <p className="mt-1 text-2xl font-bold text-catan-sheep">{stats.postgrad}</p>
            </div>
            <div className="hex-badge !h-9 !w-9 !px-0 bg-gradient-to-br from-catan-sheep to-catan-wood text-white">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
