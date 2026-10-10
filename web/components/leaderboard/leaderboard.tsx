'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Medal, Award, Crown, Flame, TrendingUp, TrendingDown, ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Send } from 'lucide-react';

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

const streakTone = (entry: LeaderboardEntry): { label: string; className: string } => {
  if (entry.matches >= 5 && entry.winRate >= 60) {
    return { label: 'On Fire', className: 'bg-social-red-soft text-social-red border-social-red' };
  }
  if (entry.wins >= 3 && entry.winRate >= 45) {
    return { label: 'Em alta', className: 'bg-forest-soft text-forest-dark border-forest/40' };
  }
  if (entry.matches >= 8 && entry.winRate <= 20) {
    return { label: 'Underdog', className: 'bg-surface-base text-muted-foreground border-border' };
  }
  return { label: 'Regular', className: 'bg-surface-base text-muted-foreground border-border' };
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
      style={{ background: `linear-gradient(145deg, ${getAvatarBg(entry.nickname)}, hsl(var(--social-red-dark)))` }}
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
type SortDirection = 'desc' | 'asc';

export function Leaderboard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [category, setCategory] = useState<Category>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('wins');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [liveMoment, setLiveMoment] = useState<string>('Rodada ao vivo: classificacao sincronizada');
  const [diceRolling, setDiceRolling] = useState(false);
  const previousRanksRef = useRef<Record<string, number>>({});
  const socketRef = useRef<Socket | null>(null);

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

  const sortedLeaderboard = useMemo(() => {
    const entries = [...(leaderboard ?? [])];

    const compare = (a: LeaderboardEntry, b: LeaderboardEntry) => {
      const direction = sortDirection === 'desc' ? -1 : 1;

      switch (sortBy) {
        case 'points':
          return direction * (a.totalPoints - b.totalPoints);
        case 'winRate':
          return direction * (a.winRate - b.winRate);
        case 'matches':
          return direction * (a.matches - b.matches);
        default:
          return direction * (a.wins - b.wins);
      }
    };

    entries.sort(compare);

    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }, [leaderboard, sortBy, sortDirection]);

  const stats = useMemo(() => {
    const e = sortedLeaderboard;
    return {
      players: e.length,
      wins: Math.max(...e.map(x => x.wins), 0),
      winRate: e.length ? Math.round(e.reduce((a, x) => a + x.winRate, 0) / e.length) : 0,
      matches: e.reduce((a, x) => a + x.matches, 0),
      undergrad: e.filter(x => x.category === 'graduacao').length,
      postgrad: e.filter(x => x.category === 'pos').length,
    };
  }, [sortedLeaderboard]);

  const podium = useMemo(() => sortedLeaderboard.slice(0, 3), [sortedLeaderboard]);

  const maxPoints = useMemo(
    () => sortedLeaderboard.reduce((max, x) => Math.max(max, x.totalPoints), 0),
    [sortedLeaderboard],
  );

  const movementByUser = useMemo(() => {
    const previous = previousRanksRef.current;
    const movement: Record<string, number> = {};
    sortedLeaderboard.forEach((entry) => {
      if (previous[entry.userId] != null) {
        movement[entry.userId] = previous[entry.userId] - entry.rank;
      }
    });
    return movement;
  }, [sortedLeaderboard]);

  useEffect(() => {
    if (!sortedLeaderboard?.length) return;
    const previous = previousRanksRef.current;
    const movers = sortedLeaderboard.filter((entry) => previous[entry.userId] != null && previous[entry.userId] > entry.rank);

    if (movers.length > 0) {
      const leader = movers[0];
      const delta = previous[leader.userId] - leader.rank;
      setLiveMoment(`Subida em destaque: ${leader.nickname} ganhou ${delta} posicao${delta > 1 ? 'es' : ''}`);
    } else {
      const top = sortedLeaderboard[0];
      setLiveMoment(`Topo da mesa: ${top.nickname} com ${top.wins} vitorias e ${top.totalPoints} pontos`);
    }

    previousRanksRef.current = Object.fromEntries(sortedLeaderboard.map((entry) => [entry.userId, entry.rank]));
  }, [sortedLeaderboard]);

  const handleSortColumn = (column: SortBy) => {
    setDiceRolling(true);
    if (sortBy === column) {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
    window.setTimeout(() => setDiceRolling(false), 520);
  };

  const renderSortIcon = (column: SortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'desc' ? (
      <ArrowDown className="h-3.5 w-3.5 text-forest-dark" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5 text-forest-dark" />
    );
  };

  const sortHeaderClassName = (column: SortBy) =>
    `leaderboard-sort-header w-full ${sortBy === column ? 'text-forest-dark' : 'text-muted-foreground hover:text-foreground'}`;

  useEffect(() => {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:4000`
        : 'http://localhost:4000');
    const socket = io(wsUrl, {
      transports: ['websocket'],
      withCredentials: true,
    });
    socketRef.current = socket;

    const refreshLeaderboard = (message: string) => {
      setLiveMoment(message);
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    };

    socket.on('connect', () => {
      setLiveMoment('Canal ao vivo conectado: atualizacoes em tempo real ativas');
    });

    socket.on('leaderboard:update', () => {
      refreshLeaderboard('Pontuacao atualizada no ranking ao vivo');
    });

    socket.on('match:approved', () => {
      refreshLeaderboard('Partida aprovada: novos pontos entrando no ranking');
    });

    socket.on('match:submitted', () => {
      setLiveMoment('Nova partida enviada: aguardando aprovacao do admin');
    });

    socket.on('scheduled-match:created', () => {
      setLiveMoment('Nova mesa agendada: confira o calendario da liga');
    });

    socket.on('scheduled-match:updated', () => {
      setLiveMoment('Mesa atualizada: jogadores entrando e saindo em tempo real');
    });

    socket.on('disconnect', () => {
      setLiveMoment('Canal ao vivo reconectando...');
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4">
        <div className="catan-panel live-strip">
          <div className="live-ticker">
            <span className="live-dot" />
            <span className="skeleton sk-line w-56" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24 rounded-lg" />
            <div className="skeleton h-8 w-28 rounded-lg" />
          </div>
        </div>
        <div className="statbar h-[4.5rem]">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="statbar-cell items-center">
              <div className="skeleton sk-line w-16" />
              <div className="skeleton sk-line w-10" />
            </div>
          ))}
        </div>
        <div className="catan-panel p-4 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div
              key={i}
              className="leaderboard-row"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="skeleton sk-rank" />
              <div className="skeleton sk-avatar" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="skeleton sk-line w-28" />
                <div className="skeleton sk-line w-44 max-w-full" />
              </div>
              <div className="hidden md:flex items-center gap-5">
                <div className="skeleton sk-num" />
                <div className="skeleton sk-num" />
                <div className="skeleton sk-num" />
                <div className="skeleton sk-num" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6 animate-fade-in">
      <div className="catan-panel live-strip animate-slide-up">
        <div className="live-ticker" aria-live="polite">
          <span className="live-dot" />
          <span className="truncate">{liveMoment}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => router.push('/calendar')}>
            <CalendarDays className="h-4 w-4" /> Ver mesas
          </Button>
          <Button type="button" size="sm" onClick={() => router.push('/submit')}>
            <Send className="h-3.5 w-3.5" /> Enviar partida
          </Button>
        </div>
      </div>

      <div className="statbar animate-slide-up">
        <div className="statbar-cell">
          <p className="statbar-label">Catanistas</p>
          <p className="statbar-value text-social-red num-tabular">{stats.players}</p>
        </div>
        <div className="statbar-cell">
          <p className="statbar-label">Vitórias</p>
          <p className="statbar-value text-forest-dark num-tabular">{stats.wins}</p>
        </div>
        <div className="statbar-cell">
          <p className="statbar-label">Taxa média</p>
          <p className="statbar-value text-gold-dark num-tabular">{stats.winRate}%</p>
        </div>
        <div className="statbar-cell">
          <p className="statbar-label">Partidas</p>
          <p className="statbar-value text-foreground num-tabular">{stats.matches}</p>
        </div>
        <div className="statbar-split">
          <div className="statbar-split-cell">
            <p className="statbar-label">Graduação</p>
            <p className="font-display text-lg font-bold text-forest-dark num-tabular">{stats.undergrad}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="statbar-split-cell">
            <p className="statbar-label">Pós</p>
            <p className="font-display text-lg font-bold text-gold-dark num-tabular">{stats.postgrad}</p>
          </div>
        </div>
      </div>

      <div className="catan-panel overflow-hidden animate-slide-up">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pb-3 pt-4 bg-surface-base/55 border-b border-border">
          <div className="flex items-center gap-2.5">
            <label className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground font-bold">Categoria</label>
            <div className="seg-group">
              {Object.entries(categoryLabels).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCategory(k as Category)}
                  className={`seg-btn ${category === k ? 'seg-btn-active' : ''}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground font-bold">Período</label>
            <div className="seg-group">
              {Object.entries(timeRangeLabels).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTimeRange(k as TimeRange)}
                  className={`seg-btn ${timeRange === k ? 'seg-btn-active' : ''}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground ${diceRolling ? 'text-foreground' : ''}`}>
            <ArrowUpDown className={`h-3.5 w-3.5 ${diceRolling ? 'animate-spin text-primary' : ''}`} />
            {diceRolling ? 'Reordenando...' : 'Ordenação livre'}
          </div>
        </div>

        {podium.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-5 px-4 pb-2 md:grid-cols-3 md:items-start">
            {[podium[1], podium[0], podium[2]].map((entry, idx) => {
              if (!entry) return null;
              const streak = streakTone(entry);
              const isFirst = entry.rank === 1;
              return (
                <div
                  key={entry.userId}
                  className={`podium-card ${isFirst ? 'podium-1 md:-mt-4 md:mb-4' : 'md:mt-2'} ${idx === 0 ? 'order-2 md:order-1' : ''} ${idx === 1 ? 'order-1 md:order-2' : ''} ${idx === 2 ? 'order-3 md:order-3' : ''}`}
                >
                  <div className="podium-rank">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <CardContent className={`flex h-full flex-col ${isFirst ? 'p-6 pt-8' : 'p-5 pt-7'} space-y-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={isFirst ? 'scale-110' : ''}>
                          <Avatar entry={entry} />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-display font-bold leading-tight text-foreground truncate ${isFirst ? 'text-xl' : 'text-lg'}`}>
                            {entry.nickname}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{entry.fullName}</p>
                        </div>
                      </div>
                      {isFirst && <Crown className="h-5 w-5 shrink-0 text-gold-dark" />}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${streak.className}`}>
                        <Flame className="h-3 w-3" /> {streak.label}
                      </span>
                      <span className={`chip ${entry.category === 'graduacao' ? 'chip-grad' : 'chip-pos'}`}>
                        {entry.category === 'graduacao' ? 'Graduação' : 'Pós'}
                      </span>
                    </div>

                    <div className="mt-auto flex gap-2 text-center">
                      <div className="flex-1 rounded-lg bg-surface-base/80 p-2 border border-border/70">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wins</p>
                        <p className="font-bold text-forest-dark num-tabular">{entry.wins}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-surface-base/80 p-2 border border-border/70">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pontos</p>
                        <p className="font-bold text-foreground num-tabular">{entry.totalPoints}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-surface-base/80 p-2 border border-border/70">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Taxa</p>
                        <p className="font-bold text-gold-dark num-tabular">{entry.winRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </div>
              );
            })}
          </div>
        )}

        <div id="leaderboard-table" className="px-4 pb-4 pt-4">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr),4.5rem,4.75rem,4.5rem,4.5rem] gap-4 px-5 pb-3 items-center">
            <div className="leaderboard-header text-left w-full border-b-0 pb-0">Colono</div>
            <button type="button" onClick={() => handleSortColumn('wins')} className={sortHeaderClassName('wins')}>
              <span>Wins</span>
              {renderSortIcon('wins')}
            </button>
            <button type="button" onClick={() => handleSortColumn('points')} className={sortHeaderClassName('points')}>
              <span>Pontos</span>
              {renderSortIcon('points')}
            </button>
            <button type="button" onClick={() => handleSortColumn('matches')} className={sortHeaderClassName('matches')}>
              <span>Partidas</span>
              {renderSortIcon('matches')}
            </button>
            <button type="button" onClick={() => handleSortColumn('winRate')} className={sortHeaderClassName('winRate')}>
              <span>Taxa</span>
              {renderSortIcon('winRate')}
            </button>
          </div>

          <div className="space-y-2">
            {sortedLeaderboard.map((entry, i) => {
              const pointsPct = maxPoints > 0 ? Math.max(6, Math.round((entry.totalPoints / maxPoints) * 100)) : 0;
              return (
                <div
                  key={entry.userId}
                  className={`leaderboard-row md:grid md:grid-cols-[minmax(0,1fr),4.5rem,4.75rem,4.5rem,4.5rem] md:items-center md:gap-4 ${movementByUser[entry.userId] > 0 ? 'leaderboard-row-hot' : ''}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <RankBadge rank={entry.rank} />
                    <Avatar entry={entry} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate leading-tight inline-flex items-center gap-1.5 max-w-full">
                        <span className="truncate">{entry.nickname}</span>
                        {movementByUser[entry.userId] > 0 && <TrendingUp className="h-3.5 w-3.5 shrink-0 text-forest-dark" />}
                        {movementByUser[entry.userId] < 0 && <TrendingDown className="h-3.5 w-3.5 shrink-0 text-social-red" />}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.fullName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 w-full md:hidden">
                    <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">WIN</p>
                      <span className="text-base font-bold text-forest-dark num-tabular">{entry.wins}</span>
                    </div>
                    <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">PTS</p>
                      <span className="text-base font-bold text-foreground num-tabular">{entry.totalPoints}</span>
                    </div>
                    <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center text-muted-foreground">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">MAT</p>
                      <span className="text-base num-tabular">{entry.matches}</span>
                    </div>
                    <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">TAXA</p>
                      <span className="text-base font-bold text-gold-dark num-tabular">{entry.winRate}%</span>
                    </div>
                  </div>

                  <div className="hidden md:flex w-full items-center justify-center text-center">
                    <span className="text-lg font-bold text-forest-dark num-tabular">{entry.wins}</span>
                  </div>
                  <div className="hidden md:block w-full text-center">
                    <span className="text-lg font-bold text-foreground num-tabular">{entry.totalPoints}</span>
                    <div className="points-track">
                      <div className="points-fill" style={{ width: `${pointsPct}%` }} />
                    </div>
                  </div>
                  <div className="hidden md:flex w-full items-center justify-center text-center text-muted-foreground">
                    <span className="text-lg num-tabular">{entry.matches}</span>
                  </div>
                  <div className="hidden md:flex w-full items-center justify-center text-center">
                    <span className="text-lg font-bold text-gold-dark num-tabular">{entry.winRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground italic space-x-3">
        <span className="text-gold-dark/60">✦</span>
        <span> Ranking atualizado em tempo real</span>
        <span className="text-gold-dark/60">•</span>
        <span> Cada vitória vale 2 pontos de vitória</span>
      </div>
    </div>
  );
}
