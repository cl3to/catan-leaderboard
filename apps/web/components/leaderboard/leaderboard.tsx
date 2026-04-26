'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, Crown } from 'lucide-react';

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

const avatarPresets: Record<string, { icon: string }> = {
  wood: { icon: '🪵' }, brick: { icon: '🧱' }, sheep: { icon: '🐑' },
  wheat: { icon: '🌾' }, ore: { icon: '🪨' }, desert: { icon: '🏜️' },
  settlement: { icon: '🏠' }, city: { icon: '🏰' }, road: { icon: '🛤️' },
  robber: { icon: '🏴' }, dice: { icon: '🎲' }, port: { icon: '⚓' },
  knight: { icon: '🛡️' }, vp: { icon: '⭐' }, trade: { icon: '⚖️' },
};

const categoryLabels: Record<string, string> = {
  all: 'Todas as Frentes',
  graduacao: 'Graduação',
  pos: 'Pós-Graduação',
};

const timeRangeLabels: Record<string, string> = {
  all: 'Desde a Fundação',
  week: 'Últimos 7 Dias',
  month: 'Últimos 30 Dias',
  year: 'Temporada Atual',
};

const sortLabels: Record<string, string> = {
  wins: 'Vitórias',
  points: 'Pontos',
  winRate: 'Taxa de Vitória',
  matches: 'Partidas',
};

const getAvatarBg = (str: string): string => {
  const colors = ['#8b4513', '#b22222', '#2e8b57', '#daa520', '#4a4a8a', '#8b008b'];
  const idx = str.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
};

const Avatar = ({ entry }: { entry: LeaderboardEntry }) => {
  if (entry.avatarUrl) {
    return <img src={entry.avatarUrl} alt="" className="avatar-token" />;
  }
  if (entry.avatarMode === 'preset' && entry.avatarKey && avatarPresets[entry.avatarKey]) {
    return (
      <div className="avatar-token" style={{ background: 'hsl(var(--surface-overlay))' }}>
        {avatarPresets[entry.avatarKey].icon}
      </div>
    );
  }
  return (
    <div
      className="avatar-token"
      style={{ background: `linear-gradient(145deg, ${getAvatarBg(entry.nickname)}, hsl(var(--gold-dark)))` }}
    >
      <span className="text-white font-semibold text-sm">{entry.nickname[0].toUpperCase()}</span>
    </div>
  );
};

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return (
    <div className="rank-badge rank-1">
      <Crown className="w-4 h-4 mb-0.5" />
      <span className="text-[0.55rem] font-bold">{rank}</span>
    </div>
  );
  if (rank === 2) return (
    <div className="rank-badge rank-2">
      <Medal className="w-4 h-4 mb-0.5" />
      <span className="text-[0.55rem] font-bold">{rank}</span>
    </div>
  );
  if (rank === 3) return (
    <div className="rank-badge rank-3">
      <Award className="w-4 h-4 mb-0.5" />
      <span className="text-[0.55rem] font-bold">{rank}</span>
    </div>
  );
  return <div className="rank-badge rank-default">{rank}</div>;
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
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<LeaderboardEntry[]>;
    },
  });

  const stats = useMemo(() => {
    const e = leaderboard ?? [];
    return {
      players: e.length,
      wins: Math.max(...e.map(x => x.wins), 0),
      winRate: e.length ? Math.round(e.reduce((a, x) => a + x.winRate, 0) / e.length) : 0,
      matches: e.reduce((a, x) => a + x.matches, 0),
      undergrad: e.filter(x => x.category === 'graduacao').length,
      postgrad: e.filter(x => x.category === 'pos').length,
    };
  }, [leaderboard]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            className="h-20 bg-surface-elevated rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end gap-4 p-4 bg-surface-base rounded-xl border border-border">
        <div className="space-y-2">
          <label className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">Categoria</label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger className="w-44 h-10 bg-surface-elevated border-border">
              <SelectValue placeholder="Frente" />
            </SelectTrigger>
            <SelectContent className="bg-surface-overlay border-border">
              {Object.entries(categoryLabels).map(([k, l]) => (
                <SelectItem key={k} value={k} className="text-foreground focus:bg-gold/10 focus:text-gold">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">Período</label>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-44 h-10 bg-surface-elevated border-border">
              <SelectValue placeholder="Época" />
            </SelectTrigger>
            <SelectContent className="bg-surface-overlay border-border">
              {Object.entries(timeRangeLabels).map(([k, l]) => (
                <SelectItem key={k} value={k} className="text-foreground focus:bg-gold/10 focus:text-gold">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">Ordenar por</label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-40 h-10 bg-surface-elevated border-border">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="bg-surface-overlay border-border">
              {Object.entries(sortLabels).map(([k, l]) => (
                <SelectItem key={k} value={k} className="text-foreground focus:bg-gold/10 focus:text-gold">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="stat-card border-gold/20">
          <CardContent className="p-4">
            <div className="text-2xl mb-1">👥</div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Catanistas</p>
            <p className="text-2xl font-display font-bold text-gold">{stats.players}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="text-2xl mb-1">🏆</div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Vitórias</p>
            <p className="text-2xl font-display font-bold text-gold">{stats.wins}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="text-2xl mb-1">📈</div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Taxa Vitória</p>
            <p className="text-2xl font-display font-bold text-emerald-400">{stats.winRate}%</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="text-2xl mb-1">🎲</div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Partidas</p>
            <p className="text-2xl font-display font-bold text-foreground">{stats.matches}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1 stat-card">
          <CardContent className="p-4 flex gap-4">
            <div className="flex-1 text-center">
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-1">Graduação</p>
              <p className="text-xl font-display font-bold text-blue-400">{stats.undergrad}</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-1">Pós</p>
              <p className="text-xl font-display font-bold text-emerald-400">{stats.postgrad}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="catan-panel overflow-hidden animate-slide-up">
        <div className="hidden md:grid grid-cols-[3.5rem,1fr,5rem,5rem,5rem,5rem] gap-3 px-5 py-4 bg-surface-base/50 border-b border-border">
          <div className="leaderboard-header">#</div>
          <div className="leaderboard-header">Colono</div>
          <div className="leaderboard-header text-center">✦ WIN</div>
          <div className="leaderboard-header text-center">◈ PTS</div>
          <div className="leaderboard-header text-center">● MAT</div>
          <div className="leaderboard-header text-center">% TAXA</div>
        </div>

        <div className="divide-y divide-border/50">
          {leaderboard?.map((entry, i) => (
            <div
              key={entry.userId}
              className="leaderboard-row"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <RankBadge rank={entry.rank} />
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar entry={entry} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{entry.nickname}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.fullName}</p>
                </div>
              </div>
              <div className="w-14 text-center">
                <span className="text-lg font-bold text-gold">{entry.wins}</span>
              </div>
              <div className="w-14 text-center">
                <span className="text-lg font-bold text-foreground">{entry.totalPoints}</span>
              </div>
              <div className="w-14 text-center text-muted-foreground">{entry.matches}</div>
              <div className="w-14 text-center">
                <span className="text-lg font-bold text-emerald-400">{entry.winRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground italic space-x-3">
        <span className="text-gold/60">✦</span>
        <span> Ranking atualizado em tempo real</span>
        <span className="text-gold/60">•</span>
        <span> Cada vitória vale 2 pontos de vitória</span>
      </div>
    </div>
  );
}