'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trophy, Users, Calendar } from 'lucide-react';
import Link from 'next/link';

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
          <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
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
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <section className="catan-hero animate-rise flex-1">
            <div className="relative z-10 space-y-3">
              <span className="catan-label bg-white/15 text-white">Detalhes</span>
              <h1 className="font-display text-3xl leading-tight sm:text-4xl">
                Partida
              </h1>
            </div>
          </section>
        </div>

        <Card className="catan-panel border-[1.5px]">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-catan-wood">
              <Trophy className="h-5 w-5" />
              Resumo
            </CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium">
                  {new Date(match.matchDate).toLocaleDateString('pt-BR', {
                    dateStyle: 'full',
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{match.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Enviada por</p>
                <p className="font-medium">{match.submittedBy?.nickname || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criada em</p>
                <p className="font-medium">
                  {new Date(match.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {match.notes && (
              <div>
                <p className="text-muted-foreground">Observações</p>
                <p className="font-medium">{match.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="catan-panel border-[1.5px]">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-catan-wood">
              <Users className="h-5 w-5" />
              Jogadores ({match.players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    player.isWinner
                      ? 'border-catan-sheep/50 bg-catan-sheep/10'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        player.isWinner
                          ? 'bg-catan-sheep text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {player.placement}
                    </div>
                    <div>
                      <p className="font-medium">{player.user.nickname}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.user.fullName} ({player.user.category})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{player.victoryPoints} pts</p>
                    {player.isWinner && (
                      <p className="text-xs text-catan-sheep">Vencedor</p>
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