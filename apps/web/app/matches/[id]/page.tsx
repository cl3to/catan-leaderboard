'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MatchPlayer {
  id: string;
  userId: string;
  placement: number;
  victoryPoints: number;
  isWinner: boolean;
  user: {
    userId: string;
    nickname: string;
    fullName: string;
    category: string;
  };
}

interface MatchDetails {
  id: string;
  matchDate: string;
  notes: string;
  status: string;
  createdAt: string;
  players: MatchPlayer[];
  submittedBy: {
    userId: string;
    nickname: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MatchDetailsPage({ params }: PageProps) {
  const [match, setMatch] = React.useState<MatchDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    async function fetchMatch() {
      const { id } = await params;
      try {
        const res = await fetch(`/api/v1/matches/${id}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setMatch(data);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchMatch();
  }, [params]);

  if (loading) {
    return (
      <main className="catan-app">
        <div className="catan-shell py-10 text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto text-gold" />
        </div>
      </main>
    );
  }

  if (error || !match) {
    notFound();
  }

  const sortedPlayers = [...match.players].sort(
    (a, b) => a.placement - b.placement
  );

  return (
    <main className="catan-app">
      <div className="catan-shell space-y-6 py-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <section className="catan-hero animate-slide-up flex-1">
            <div className="relative z-10 space-y-3">
              <span className="catan-label">Detalhes</span>
              <h1 className="font-display text-3xl leading-tight sm:text-4xl text-foreground">
                Partida
              </h1>
            </div>
          </section>
        </div>

        <Card className="catan-panel border-border">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Trophy className="h-5 w-5 text-gold" />
              Resumo
            </CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium text-foreground">
                  {new Date(match.matchDate).toLocaleDateString('pt-BR', {
                    dateStyle: 'full',
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium text-foreground capitalize">{match.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Enviada por</p>
                <p className="font-medium text-foreground">{match.submittedBy?.nickname || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criada em</p>
                <p className="font-medium text-foreground">
                  {new Date(match.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {match.notes && (
              <div>
                <p className="text-muted-foreground">Observações</p>
                <p className="font-medium text-foreground">{match.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="catan-panel border-border">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-gold" />
              Jogadores ({match.players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 transition-all',
                    player.isWinner
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-border bg-surface-base/50 hover:bg-surface-base'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                        player.isWinner
                          ? 'bg-emerald-500 text-white'
                          : 'bg-surface-elevated text-muted-foreground'
                      )}
                    >
                      {player.placement}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{player.user.nickname}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.user.fullName} ({player.user.category})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-foreground">{player.victoryPoints} pts</p>
                    {player.isWinner && (
                      <p className="text-xs text-emerald-400">Vencedor</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}