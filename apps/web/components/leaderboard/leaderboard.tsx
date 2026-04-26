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
import { Trophy, Medal, Award, Users, Flame, Pickaxe, Wheat } from 'lucide-react';
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
  graduacao: 'Graduação',
  pos: 'Pós-graduação',
};

const timeRangeLabels = {
  all: 'Desde fundação',
  week: 'Últimos 7 dias',
  month: 'Últimos 30 dias',
  year: 'Temporada atual',
};

const sortLabels = {
  wins: 'Vitórias',
  points: 'Pontos',
  winRate: 'Taxa de vitória',
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

const RankBadge = ({ rank }: { rank: number }) => {
  const baseClass = 'flex h-10 w-10 items-center justify-center rounded-none font-bold';
  const clipPath = 'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  if (rank === 1) {
    return (
      <div className="rank-badge-gold flex h-10 w-10 items-center justify-center" style={{ clipPath }}>
        <Trophy className="h-4 w-4" />
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="rank-badge-silver flex h-10 w-10 items-center justify-center" style={{ clipPath }}>
        <Medal className="h-4 w-4" />
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="rank-badge-bronze flex h-10 w-10 items-center justify-center" style={{ clipPath }}>
        <Award className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="rank-badge-default flex h-10 w-10 items-center justify-center" style={{ clipPath }}>
      {rank}
    </div>
  );
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
  const clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt={`Avatar de ${entry.nickname}`}
        className="h-12 w-12 border object-cover"
        style={{ clipPath, borderColor: '#8a7a6a' }}
      />
    );
  }

  if (preset) {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center text-xl"
        style={{ 
          background: preset.color + '30', 
          clipPath,
          border: '2px solid rgba(138, 122, 106, 0.5)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.2)'
        }}
        aria-label={`Avatar de ${entry.nickname}`}
      >
        {preset.icon}
      </div>
    );
  }

  return (
    <div
      className="flex h-12 w-12 items-center justify-center text-lg font-bold text-white"
      style={{ 
        background: getAvatarBackground(entry.nickname), 
        clipPath,
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)'
      }}
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
            <span className="terrain-chip">Atualização em tempo real</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5a4a3a]">
                Frente acadêmica
              </label>
              <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
                <SelectTrigger className="catan-input h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="catan-input border-0 bg-[#333] text-gray-100">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="focus:bg-[#444]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5a4a3a]">
                Janela histórica
              </label>
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="catan-input h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="catan-input border-0 bg-[#333] text-gray-100">
                  {Object.entries(timeRangeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="focus:bg-[#444]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5a4a3a]">
                Ordenar por
              </label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger className="catan-input h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="catan-input border-0 bg-[#333] text-gray-100">
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="focus:bg-[#444]">
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
            <p className="text-xs uppercase tracking-[0.13em] text-[#5a4a3a]">Catanistas</p>
            <p className="mt-1 text-2xl font-bold text-[#3d2e22]">{stats.totalPlayers}</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-[#5a4a3a]">Vitórias</p>
            <p className="mt-1 text-2xl font-bold text-[#8B4513]">{stats.topWins}</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-[#5a4a3a]">Taxa vitória</p>
            <p className="mt-1 text-2xl font-bold text-[#556B2F]">{stats.avgWinRate}%</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-[#5a4a3a]">Partidas</p>
            <p className="mt-1 text-2xl font-bold text-[#2F4F4F]">{stats.totalMatches}</p>
          </CardContent>
        </Card>
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-[#5a4a3a]">Média pts</p>
            <p className="mt-1 text-2xl font-bold text-[#3d2e22]">{stats.avgPoints}</p>
          </CardContent>
        </Card>
      </div>

      {topThree.length > 0 && (
        <Card className="catan-panel border-[1.5px]">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#8B0000]" />
              <h3 className="font-display text-xl text-[#3d2e22]">Pódio da Revolução</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {topThree.map((entry) => (
                <div
                  key={`podium-${entry.userId}`}
                  className={cn(
                    'leaderboard-row animate-rise p-3',
                    entry.rank === 1 && 'sm:-translate-y-2'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <RankBadge rank={entry.rank} />
                    <div>
                      <p className="font-semibold leading-none text-[#3d2e22]">{entry.nickname}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#7a6a5a]">
                        {entry.category === 'graduacao' ? 'Graduação' : 'Pós-graduação'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-[#e8e3d6] px-2 py-1.5">
                      <p className="text-[#5a4a3a]">WIN</p>
                      <p className="font-bold text-[#8B4513]">{entry.wins}</p>
                    </div>
                    <div className="rounded-xl bg-[#e8e3d6] px-2 py-1.5">
                      <p className="text-[#5a4a3a]">PTS</p>
                      <p className="font-bold text-[#3d2e22]">{entry.totalPoints}</p>
                    </div>
                    <div className="rounded-xl bg-[#e8e3d6] px-2 py-1.5">
                      <p className="text-[#5a4a3a]">MAT</p>
                      <p className="font-bold text-[#2F4F4F]">{entry.matches}</p>
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
                <div key={item} className="h-16 animate-pulse rounded-full bg-[#e8e3d6]" />
              ))}
            </div>
          ) : leaderboard?.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center sm:p-10">
              <Pickaxe className="h-9 w-9 text-[#7a6a5a]" />
              <p className="font-display text-xl text-[#3d2e22]">Sem colonos no ranking</p>
              <p className="max-w-sm text-sm text-[#7a6a5a]">
                Nenhum jogador corresponde aos filtros escolhidos. Mude categoria ou período para explorar outras mesas.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#c9b896]/50">
              {leaderboard?.map((entry, index) => (
                <li
                  key={entry.userId}
                  className="leaderboard-row animate-rise px-4 py-3"
                  style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
                >
                  <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 sm:grid-cols-[auto,1fr,auto,auto,auto] sm:gap-4">
                    <RankBadge rank={entry.rank} />

                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar entry={entry} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#3d2e22]">{entry.nickname}</p>
                        <p className="truncate text-xs text-[#7a6a5a]">{entry.fullName}</p>
                        <span className="mt-1 inline-flex rounded-full border border-[#c9b896] bg-[#e8e3d6] px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[#5a4a3a] sm:hidden">
                          {entry.category === 'graduacao' ? 'Graduação' : 'Pós'}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.11em]',
                          entry.category === 'graduacao'
                            ? 'border-[#4682B4]/50 bg-[#4682B4]/15 text-[#4682B4]'
                            : 'border-[#556B2F]/50 bg-[#556B2F]/15 text-[#556B2F]'
                        )}
                      >
                        {entry.category === 'graduacao' ? 'Graduação' : 'Pós'}
                      </span>
                    </div>

                    <div className="flex grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 sm:flex sm:items-center sm:gap-3 sm:text-xs">
                      <div className="rounded-xl bg-[#e8e3d6] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[#5a4a3a]">
                          <Wheat className="mr-1 inline h-3 w-3" />
                          WIN
                        </p>
                        <p className="text-sm font-bold text-[#8B4513]">{entry.wins}</p>
                      </div>
                      <div className="rounded-xl bg-[#e8e3d6] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[#5a4a3a]">PTS</p>
                        <p className="text-sm font-bold text-[#3d2e22]">{entry.totalPoints}</p>
                      </div>
                      <div className="rounded-xl bg-[#e8e3d6] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[#5a4a3a]">MAT</p>
                        <p className="text-sm font-bold text-[#2F4F4F]">{entry.matches}</p>
                      </div>
                      <div className="rounded-xl bg-[#e8e3d6] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[#5a4a3a]">%</p>
                        <p className="text-sm font-bold text-[#556B2F]">{entry.winRate}%</p>
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
              <p className="text-xs uppercase tracking-[0.12em] text-[#5a4a3a]">Graduação</p>
              <p className="mt-1 text-2xl font-bold text-[#4682B4]">{stats.undergrad}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#4682B4]">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="catan-panel border-[1.5px]">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#5a4a3a]">Pós-graduação</p>
              <p className="mt-1 text-2xl font-bold text-[#556B2F]">{stats.postgrad}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#556B2F]">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}