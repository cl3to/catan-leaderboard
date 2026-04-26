'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Users, Plus, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ScheduledMatch {
  id: string;
  title: string | null;
  scheduledDate: string;
  minPlayers: number;
  maxPlayers: number;
  status: string;
  currentPlayers: number;
  creator: {
    userId: string;
    nickname: string;
  };
  players: Array<{
    userId: string;
    nickname: string;
    joinedAt: string;
  }>;
}

const statusStyles: Record<string, { label: string; classes: string }> = {
  open: {
    label: 'Aberta',
    classes: 'border-catan-sheep/50 bg-catan-sheep/20 text-catan-sheep',
  },
  cancelled: {
    label: 'Cancelada',
    classes: 'border-destructive/40 bg-destructive/15 text-destructive',
  },
  complete: {
    label: 'Completa',
    classes: 'border-catan-ocean/45 bg-catan-ocean/15 text-catan-ocean',
  },
};

export default function CalendarPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ['scheduled-matches'],
    queryFn: async () => {
      const res = await fetch('/api/v1/scheduled-matches');
      if (!res.ok) throw new Error('Failed to fetch matches');
      return res.json() as Promise<ScheduledMatch[]>;
    },
  });

  const stats = useMemo(() => {
    const list = matches ?? [];
    const open = list.filter((match) => match.status === 'open').length;
    const totalSlots = list.reduce((acc, match) => acc + match.maxPlayers, 0);
    const occupiedSlots = list.reduce((acc, match) => acc + match.currentPlayers, 0);
    return { total: list.length, open, totalSlots, occupiedSlots };
  }, [matches]);

  return (
    <main className="catan-app">
      <div className="catan-shell space-y-5 pb-10 pt-3 sm:space-y-6 sm:pt-4">
        <section className="catan-hero animate-rise">
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="catan-label bg-white/15 text-white">Agenda da Liga</span>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">Calendario da Revolucao de Catan</h1>
            <p className="text-sm text-white/90 sm:text-base">
              Organize as mesas da Liga Socialista do Catan, convide colonos e acompanhe quais frentes ja
              estao em disputa.
            </p>
          </div>
          <div className="relative z-10 mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 sm:gap-3">
            <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.13em] text-white/75">Partidas</p>
              <p className="font-semibold text-white">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.13em] text-white/75">Abertas</p>
              <p className="font-semibold text-white">{stats.open}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.13em] text-white/75">Vagas</p>
              <p className="font-semibold text-white">{stats.totalSlots}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.13em] text-white/75">Preenchidas</p>
              <p className="font-semibold text-white">{stats.occupiedSlots}</p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end">
          <Button className="h-10 rounded-full px-5">
            <Plus className="mr-1.5 h-4 w-4" /> Agendar nova partida
          </Button>
        </div>

        {isLoading ? (
          <Card className="catan-panel border-[1.5px]">
            <CardContent className="space-y-3 p-4 sm:p-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-2xl bg-secondary/70" />
              ))}
            </CardContent>
          </Card>
        ) : matches?.length === 0 ? (
          <Card className="catan-panel border-[1.5px]">
            <CardContent className="p-10 text-center">
              <CalendarIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="font-display text-2xl text-catan-wood">Nenhuma frente agendada</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Seja o primeiro a convocar uma mesa da Liga Socialista do Catan.
              </p>
              <Button className="mt-5 rounded-full px-5">
                <Plus className="mr-1.5 h-4 w-4" /> Criar primeira partida
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches?.map((match, index) => {
              const status = statusStyles[match.status] ?? statusStyles.complete;
              return (
                <Card
                  key={match.id}
                  className="catan-panel animate-rise overflow-hidden border-[1.5px]"
                  style={{ animationDelay: `${Math.min(index * 70, 280)}ms` }}
                >
                  <CardHeader className="space-y-3 bg-gradient-to-r from-catan-wood/8 via-catan-brick/8 to-catan-ocean/8 p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="font-display text-xl text-catan-wood">
                        {match.title || 'Partida da Liga'}
                      </CardTitle>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]',
                          status.classes
                        )}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <p className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {format(new Date(match.scheduledDate), "dd 'de' MMMM 'as' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <Flag className="h-4 w-4" />
                        Coordenador: <span className="font-medium text-foreground">{match.creator.nickname}</span>
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 p-4">
                    <div className="rounded-2xl bg-secondary/65 p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
                        <Users className="h-4 w-4 text-catan-ocean" />
                        {match.currentPlayers} / {match.maxPlayers} jogadores
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Minimo para iniciar: {match.minPlayers}</p>
                    </div>

                    {match.players.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                          Colonos confirmados
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.players.slice(0, 6).map((player) => (
                            <span
                              key={player.userId}
                              className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                            >
                              {player.nickname}
                            </span>
                          ))}
                          {match.players.length > 6 && (
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              +{match.players.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-9 flex-1 rounded-xl">
                        Ver detalhes
                      </Button>
                      {match.status === 'open' && match.currentPlayers < match.maxPlayers && (
                        <Button size="sm" className="h-9 flex-1 rounded-xl">
                          Participar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
