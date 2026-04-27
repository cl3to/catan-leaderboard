'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Medal, Award, Crown, Flame, Dices, TrendingUp, TrendingDown, Flag, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

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
    return { label: 'Em alta', className: 'bg-social-red-soft text-social-red border-social-red' };
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
      <ArrowDown className="h-3.5 w-3.5 text-social-red" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5 text-social-red" />
    );
  };

  const sortHeaderClassName = (column: SortBy) =>
    `leaderboard-sort-header w-full ${sortBy === column ? 'text-social-red' : 'text-muted-foreground hover:text-foreground'}`;

  const scrollToLeaderboard = () => {
    document.getElementById('leaderboard-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
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
    <div className="mt-8 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="stat-card border-social-red bg-social-red-soft">
              <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-social-red font-semibold">Desafio da semana</p>
              <p className="text-sm font-semibold text-foreground">Ganhe 3 partidas para entrar no pódio</p>
            </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push('/calendar')}
                className="border-social-red px-4 text-white hover:text-white"
                style={{ backgroundColor: 'hsl(var(--social-red-dark))', backgroundImage: 'none' }}
              >
                Ver mesas
              </Button>
          </CardContent>
        </Card>
        <Card className="stat-card border-social-red bg-social-red-soft">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-social-red font-semibold">Caçador do topo</p>
              <p className="text-sm font-semibold text-foreground">{podium[1]?.nickname || 'Jogador'} está perseguindo {podium[0]?.nickname || 'a liderança'}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={scrollToLeaderboard}
              className="border-social-red px-4 text-white hover:text-white"
              style={{ backgroundColor: 'hsl(var(--social-red-dark))', backgroundImage: 'none' }}
            >
              Ver ranking
            </Button>
          </CardContent>
        </Card>
        <Card className="stat-card border-social-red bg-social-red-soft">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-social-red font-semibold">Ação rápida</p>
              <p className="text-sm font-semibold text-foreground">Registre seu resultado e mova o ranking agora</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/submit')}
              className="border-social-red px-4 text-white hover:text-white"
              style={{ backgroundColor: 'hsl(var(--social-red-dark))', backgroundImage: 'none' }}
            >
              Enviar
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="stat-card border-social-red/20">
          <CardContent className="p-4">
            <div className="text-2xl mb-1">👥</div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Catanistas</p>
            <p className="text-2xl font-display font-bold text-social-red">{stats.players}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="text-2xl mb-1">🏆</div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Vitórias</p>
            <p className="text-2xl font-display font-bold text-social-red">{stats.wins}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="text-2xl mb-1">📈</div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Taxa Vitória</p>
            <p className="text-2xl font-display font-bold text-social-red-dark">{stats.winRate}%</p>
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
              <p className="text-xl font-display font-bold text-social-red-dark">{stats.undergrad}</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-1">Pós</p>
              <p className="text-xl font-display font-bold text-social-red">{stats.postgrad}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="catan-panel overflow-hidden animate-slide-up">
        <Card className="stat-card border-social-red overflow-hidden m-4 mb-0 bg-social-red-soft/40">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-social-red-soft">
              <Flag className="h-4 w-4 text-social-red" />
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-semibold">Ticker da Liga</p>
            </div>
            <div aria-live="polite" className="px-4 py-3 text-sm font-medium text-foreground flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <span className="inline-flex h-2 w-2 rounded-full bg-social-red animate-pulse" />
              <span className="inline-block animate-[marquee_14s_linear_infinite]">{liveMoment}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-end gap-4 px-4 pb-4 pt-3 bg-surface-base/55 border-b border-border">
          <div className="space-y-2">
            <label className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">Categoria</label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="w-44 h-10 bg-surface-elevated border-border">
                <SelectValue placeholder="Frente" />
              </SelectTrigger>
              <SelectContent className="bg-surface-overlay border-border">
                {Object.entries(categoryLabels).map(([k, l]) => (
                  <SelectItem key={k} value={k} className="text-foreground focus:bg-social-red-soft focus:text-social-red">
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
                  <SelectItem key={k} value={k} className="text-foreground focus:bg-social-red-soft focus:text-social-red">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-social-red bg-social-red-soft/80 px-3 py-2 text-xs font-semibold text-social-red">
              <Dices className={`h-4 w-4 ${diceRolling ? 'animate-spin' : ''}`} />
              {diceRolling ? 'Rolando dados...' : 'Dados prontos'}
            </div>
          </div>
        </div>

        {podium.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 px-4 md:grid-cols-3">
            {podium.map((entry) => {
              const streak = streakTone(entry);
              return (
                <Card
                  key={entry.userId}
                  className={`stat-card h-full border-social-red/30 ${entry.rank === 1 ? 'md:-translate-y-1 shadow-[0_0_20px_hsl(var(--social-red)_/_0.12)]' : ''}`}
                >
                  <CardContent className="flex h-full flex-col p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <RankBadge rank={entry.rank} />
                        <div className="min-w-0">
                          <p className="font-display text-lg leading-tight text-foreground truncate">{entry.nickname}</p>
                          <p className="text-xs text-muted-foreground truncate">{entry.fullName}</p>
                        </div>
                      </div>
                      <div className={`chip ${streak.className}`}>
                        <Flame className="h-3 w-3" /> {streak.label}
                      </div>
                    </div>

                    <div className="mt-auto flex gap-2 text-center">
                      <div className="flex-1 rounded-lg bg-surface-base/80 p-2 border border-border">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">WIN</p>
                        <p className="font-bold text-social-red">{entry.wins}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-surface-base/80 p-2 border border-border">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">PTS</p>
                        <p className="font-bold text-foreground">{entry.totalPoints}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-surface-base/80 p-2 border border-border">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">TAXA</p>
                        <p className="font-bold text-social-red-dark">{entry.winRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div id="leaderboard-table" className="px-4 pb-4 pt-4">
          <div className="hidden md:grid grid-cols-[3.5rem,1fr,5rem,5rem,5rem,5rem] gap-3 px-5 py-4 bg-surface-base/50 border-b border-border justify-items-center items-center">
            <div className="leaderboard-header text-center w-full">POS.</div>
            <div className="leaderboard-header text-left justify-self-start w-full">Colono</div>
            <button type="button" onClick={() => handleSortColumn('wins')} className={sortHeaderClassName('wins')}>
              <span>✦ WIN</span>
              {renderSortIcon('wins')}
            </button>
            <button type="button" onClick={() => handleSortColumn('points')} className={sortHeaderClassName('points')}>
              <span>◈ PTS</span>
              {renderSortIcon('points')}
            </button>
            <button type="button" onClick={() => handleSortColumn('matches')} className={sortHeaderClassName('matches')}>
              <span>● MAT</span>
              {renderSortIcon('matches')}
            </button>
            <button type="button" onClick={() => handleSortColumn('winRate')} className={sortHeaderClassName('winRate')}>
              <span>% TAXA</span>
              {renderSortIcon('winRate')}
            </button>
          </div>

          <div className="divide-y divide-border/50">
            {sortedLeaderboard.map((entry, i) => (
              <div
                key={entry.userId}
                className={`leaderboard-row md:grid md:grid-cols-[3.5rem,1fr,5rem,5rem,5rem,5rem] md:items-center md:justify-items-center md:gap-3 ${movementByUser[entry.userId] > 0 ? 'leaderboard-row-hot' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 md:hidden">
                  <RankBadge rank={entry.rank} />
                  <Avatar entry={entry} />
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="font-semibold text-foreground truncate leading-tight inline-flex items-center gap-1.5">
                      {entry.nickname}
                      {movementByUser[entry.userId] > 0 && <TrendingUp className="h-3.5 w-3.5 text-social-red" />}
                      {movementByUser[entry.userId] < 0 && <TrendingDown className="h-3.5 w-3.5 text-social-red-dark" />}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.fullName}</p>
                  </div>
                </div>

                <div className="hidden md:flex md:items-center md:justify-center w-full">
                  <RankBadge rank={entry.rank} />
                </div>

                <div className="hidden md:flex items-center justify-start gap-3 min-w-0 text-left justify-self-start w-full">
                  <Avatar entry={entry} />
                  <div className="min-w-0 text-left">
                    <p className="font-semibold text-foreground truncate inline-flex items-center justify-start gap-1.5 w-full">
                      {entry.nickname}
                      {movementByUser[entry.userId] > 0 && <TrendingUp className="h-3.5 w-3.5 text-social-red" />}
                      {movementByUser[entry.userId] < 0 && <TrendingDown className="h-3.5 w-3.5 text-social-red-dark" />}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.fullName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 w-full md:hidden">
                  <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide md:hidden">WIN</p>
                    <span className="text-base md:text-lg font-bold text-social-red">{entry.wins}</span>
                  </div>
                  <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide md:hidden">PTS</p>
                    <span className="text-base md:text-lg font-bold text-foreground">{entry.totalPoints}</span>
                  </div>
                  <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center text-muted-foreground">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide md:hidden">MAT</p>
                    <span className="text-base md:text-lg">{entry.matches}</span>
                  </div>
                  <div className="rounded-lg bg-surface-elevated/75 py-1.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide md:hidden">TAXA</p>
                    <span className="text-base md:text-lg font-bold text-social-red-dark">{entry.winRate}%</span>
                  </div>
                </div>

                <div className="hidden md:flex w-full items-center justify-center text-center">
                  <span className="text-lg font-bold text-social-red">{entry.wins}</span>
                </div>
                <div className="hidden md:flex w-full items-center justify-center text-center">
                  <span className="text-lg font-bold text-foreground">{entry.totalPoints}</span>
                </div>
                <div className="hidden md:flex w-full items-center justify-center text-center text-muted-foreground">
                  <span className="text-lg">{entry.matches}</span>
                </div>
                <div className="hidden md:flex w-full items-center justify-center text-center">
                  <span className="text-lg font-bold text-social-red-dark">{entry.winRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground italic space-x-3">
        <span className="text-social-red/60">✦</span>
        <span> Ranking atualizado em tempo real</span>
        <span className="text-social-red/60">•</span>
        <span> Cada vitória vale 2 pontos de vitória</span>
      </div>
    </div>
  );
}
