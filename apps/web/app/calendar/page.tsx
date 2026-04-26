'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { Calendar as CalendarIcon, Clock, Users, Plus, Flag, Loader2, X, LogOut } from 'lucide-react';

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

const createMatchSchema = z.object({
  title: z.string().optional(),
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  minPlayers: z.number().min(2).max(6),
  maxPlayers: z.number().min(2).max(6),
}).refine((data) => data.minPlayers <= data.maxPlayers, {
  message: 'Mínimo não pode ser maior que máximo',
  path: ['minPlayers'],
});

type CreateMatchValues = z.infer<typeof createMatchSchema>;

const statusStyles: Record<string, { label: string; classes: string }> = {
  open: {
    label: 'Aberta',
    classes: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  },
  cancelled: {
    label: 'Cancelada',
    classes: 'border-destructive/40 bg-destructive/15 text-destructive',
  },
  complete: {
    label: 'Completa',
    classes: 'border-blue-500/30 bg-blue-500/15 text-blue-400',
  },
};

export default function CalendarPage() {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const [selectedMatch, setSelectedMatch] = React.useState<ScheduledMatch | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = React.useState(false);

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  };

  const { data: matches, isLoading } = useQuery({
    queryKey: ['scheduled-matches'],
    queryFn: async () => {
      const res = await fetch('/api/v1/scheduled-matches');
      if (!res.ok) throw new Error('Failed to fetch matches');
      return res.json() as Promise<ScheduledMatch[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateMatchValues) => {
      const res = await fetch('/api/v1/scheduled-matches', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: values.title || null,
          scheduledDate: new Date(values.scheduledDate).toISOString(),
          minPlayers: values.minPlayers,
          maxPlayers: values.maxPlayers,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create match');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-matches'] });
      setShowCreateDialog(false);
      toast({ title: 'Partida agendada!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(`/api/v1/scheduled-matches/${matchId}/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to join');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-matches'] });
      setShowDetailsDialog(false);
      toast({ title: 'Você entrou na partida!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(`/api/v1/scheduled-matches/${matchId}/leave`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to leave');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-matches'] });
      setShowDetailsDialog(false);
      toast({ title: 'Você saiu da partida!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(`/api/v1/scheduled-matches/${matchId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-matches'] });
      setShowDetailsDialog(false);
      toast({ title: 'Partida cancelada!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const form = useForm<CreateMatchValues>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      title: '',
      scheduledDate: new Date().toISOString().slice(0, 16),
      minPlayers: 3,
      maxPlayers: 4,
    },
  });

  const currentUserId = session?.user?.id;

  const handleViewDetails = (match: ScheduledMatch) => {
    setSelectedMatch(match);
    setShowDetailsDialog(true);
  };

  const handleJoin = () => {
    if (selectedMatch) {
      joinMutation.mutate(selectedMatch.id);
    }
  };

  const handleLeave = () => {
    if (selectedMatch) {
      leaveMutation.mutate(selectedMatch.id);
    }
  };

  const handleDelete = () => {
    if (selectedMatch) {
      deleteMutation.mutate(selectedMatch.id);
    }
  };

  const isParticipant = selectedMatch?.players.some((p) => p.userId === currentUserId);
  const isCreator = selectedMatch?.creator.userId === currentUserId;
  const isLoggedIn = sessionStatus === 'authenticated';

  return (
    <main className="catan-app">
      <div className="catan-shell space-y-5 pb-10 pt-3 sm:space-y-6 sm:pt-4">
        <section className="catan-hero animate-slide-up">
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="catan-label">Agenda da Liga</span>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl text-foreground">
              Calendário da Revolução de Catan
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Organize as mesas da Liga Socialista do Catan, convide colonos e acompanhe quais frentes já estão em disputa.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end">
          {isLoggedIn && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="h-10 rounded-full px-5">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agendar nova partida
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-elevated border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Agendar Partida</DialogTitle>
                  <DialogDescription>
                    Crie uma nova partida agendada.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Título (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Catan de sábado"
                              {...field}
                              className="bg-surface-base border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Data e Horário
                          </FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} className="bg-surface-base border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minPlayers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                              Mínimo de jogadores
                            </FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(parseInt(v))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-surface-base border-border">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-surface-overlay border-border">
                                {[2, 3, 4].map((n) => (
                                  <SelectItem key={n} value={n.toString()}>
                                    {n}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxPlayers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                              Máximo de jogadores
                            </FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(parseInt(v))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-surface-base border-border">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-surface-overlay border-border">
                                {[2, 3, 4, 5, 6].map((n) => (
                                  <SelectItem key={n} value={n.toString()}>
                                    {n}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Agendar'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <Card className="catan-panel border-border">
            <CardContent className="space-y-3 p-4 sm:p-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-2xl bg-surface-base" />
              ))}
            </CardContent>
          </Card>
        ) : !isLoggedIn ? (
          <Card className="catan-panel border-border">
            <CardContent className="p-10 text-center">
              <CalendarIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="font-display text-2xl text-foreground">
                Faça login para participar
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Entre na Liga para criar e participar de partidas agendadas.
              </p>
            </CardContent>
          </Card>
        ) : matches?.length === 0 ? (
          <Card className="catan-panel border-border">
            <CardContent className="p-10 text-center">
              <CalendarIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="font-display text-2xl text-foreground">
                Nenhuma frente agendada
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Seja o primeiro a convocar uma mesa da Liga Socialista do Catan.
              </p>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="mt-5 rounded-full px-5">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Criar primeira partida
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches?.map((match, index) => {
              const status = statusStyles[match.status] ?? statusStyles.complete;
              return (
                <Card
                  key={match.id}
                  className="catan-panel animate-slide-up overflow-hidden border-border"
                  style={{ animationDelay: `${Math.min(index * 70, 280)}ms` }}
                >
                  <CardHeader className="space-y-3 bg-surface-base/50 p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="font-display text-xl text-foreground">
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
                        {format(new Date(match.scheduledDate), "dd 'de' MMMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <Flag className="h-4 w-4" />
                        Coordenador:{' '}
                        <span className="font-medium text-foreground">
                          {match.creator.nickname}
                        </span>
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 p-4">
                    <div className="rounded-xl bg-surface-base/70 p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-gold" />
                        {match.currentPlayers} / {match.maxPlayers} jogadores
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mínimo para iniciar: {match.minPlayers}
                      </p>
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
                              className="inline-flex items-center rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium text-foreground"
                            >
                              {player.nickname}
                            </span>
                          ))}
                          {match.players.length > 6 && (
                            <span className="inline-flex items-center rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              +{match.players.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 flex-1 rounded-xl border-border"
                        onClick={() => handleViewDetails(match)}
                      >
                        Ver detalhes
                      </Button>
                      {isLoggedIn &&
                        match.status === 'open' &&
                        match.currentPlayers < match.maxPlayers && (
                          <Button
                            size="sm"
                            className="h-9 flex-1 rounded-xl"
                            onClick={() => {
                              setSelectedMatch(match);
                              handleJoin();
                            }}
                            disabled={joinMutation.isPending}
                          >
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

        <Dialog
          open={showDetailsDialog}
          onOpenChange={(open) => {
            setShowDetailsDialog(open);
            if (!open) setSelectedMatch(null);
          }}
        >
          <DialogContent className="max-w-lg bg-surface-elevated border-border">
            {selectedMatch && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    {selectedMatch.title || 'Partida da Liga'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {format(
                      new Date(selectedMatch.scheduledDate),
                      "dd 'de' MMMM 'às' HH:mm",
                      { locale: ptBR }
                    )}{' '}
                    - Coordenador: {selectedMatch.creator.nickname}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg bg-surface-base/70 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedMatch.currentPlayers} / {selectedMatch.maxPlayers}{' '}
                      jogadores
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mínimo: {selectedMatch.minPlayers}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Status: {statusStyles[selectedMatch.status]?.label}
                    </p>
                  </div>

                  {selectedMatch.players.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Jogadores ({selectedMatch.players.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMatch.players.map((player) => (
                          <span
                            key={player.userId}
                            className={cn(
                              'inline-flex items-center rounded-full border px-3 py-1 text-sm',
                              player.userId === currentUserId
                                ? 'border-gold/30 bg-gold/10 text-gold'
                                : 'border-border bg-surface-base text-foreground'
                            )}
                          >
                            {player.nickname}
                            {player.userId === currentUserId && ' (você)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <DialogFooter className="flex-col gap-2 sm:flex-row">
                    {isLoggedIn &&
                      selectedMatch.status === 'open' &&
                      selectedMatch.currentPlayers <
                        selectedMatch.maxPlayers &&
                      !isParticipant && (
                        <Button
                          className="flex-1"
                          onClick={handleJoin}
                          disabled={joinMutation.isPending}
                        >
                          {joinMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Participar'
                          )}
                        </Button>
                      )}
                    {isLoggedIn && isParticipant && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleLeave}
                        disabled={leaveMutation.isPending}
                      >
                        {leaveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                          </>
                        )}
                      </Button>
                    )}
                    {isLoggedIn && isCreator && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                          </>
                        )}
                      </Button>
                    )}
                  </DialogFooter>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}