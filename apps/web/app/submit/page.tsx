'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { Calendar, Users, Trophy, Plus, X, Swords } from 'lucide-react';

interface Player {
  userId: string;
  nickname: string;
  fullName: string;
}

const playerSchema = z.object({
  userId: z.string().min(1, 'Selecione um jogador'),
  placement: z.number().min(1).max(6),
  victoryPoints: z.number().min(0).max(30),
});

const submitMatchSchema = z.object({
  matchDate: z.string().min(1, 'Data é obrigatória'),
  notes: z.string().optional(),
  players: z
    .array(playerSchema)
    .min(2, 'Mínimo de 2 jogadores')
    .max(6, 'Máximo de 6 jogadores'),
});

type SubmitMatchValues = z.infer<typeof submitMatchSchema>;

export default function SubmitMatchPage() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  };

  const form = useForm<SubmitMatchValues>({
    resolver: zodResolver(submitMatchSchema),
    defaultValues: {
      matchDate: new Date().toISOString().slice(0, 16),
      notes: '',
      players: [
        { userId: '', placement: 1, victoryPoints: 10 },
        { userId: '', placement: 2, victoryPoints: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'players',
  });

  React.useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await fetch('/api/v1/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setAvailablePlayers(
            data.map((p: any) => ({
              userId: p.userId,
              nickname: p.nickname,
              fullName: p.fullName,
            }))
          );
        }
      } catch (e) {
        console.error('Failed to fetch players:', e);
      } finally {
        setPlayersLoading(false);
      }
    }
    if (status === 'authenticated') {
      fetchPlayers();
    }
  }, [status]);

  const selectedPlayers = form.watch('players').map((p) => p.userId).filter(Boolean);

  const unusedPlayers = useMemo(() => {
    return availablePlayers.filter((p) => !selectedPlayers.includes(p.userId));
  }, [availablePlayers, selectedPlayers]);

  const maxPlacement = Math.max(...form.watch('players').map((p) => p.placement), 0);

  const onSubmit = async (values: SubmitMatchValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        matchDate: new Date(values.matchDate).toISOString(),
        notes: values.notes || '',
        players: values.players.map((p) => ({
          userId: p.userId,
          placement: p.placement,
          victoryPoints: p.victoryPoints,
        })),
      };

      const res = await fetch('/api/v1/matches', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao submeter partida');
      }

      toast({
        title: 'Partida enviada!',
        description: 'Aguarde aprovação do administrador.',
      });

      form.reset({
        matchDate: new Date().toISOString().slice(0, 16),
        notes: '',
        players: [
          { userId: '', placement: 1, victoryPoints: 10 },
          { userId: '', placement: 2, victoryPoints: 0 },
        ],
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao submeter partida',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== 'authenticated') {
    return (
      <main className="catan-app">
        <div className="catan-shell py-10 text-center">
          <p className="text-muted-foreground">Faça login para submeter partidas.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="catan-app">
      <div className="catan-shell space-y-6 py-6">
        <section className="catan-hero animate-slide-up">
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="catan-label">Resultados</span>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl text-foreground">
              Enviar Partida
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Registre o resultado de uma partida de Catan e concorrentes serão ranqueados.
            </p>
          </div>
        </section>

        <Card className="catan-panel border-border animate-slide-up">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Swords className="h-5 w-5 text-gold" />
              Dados da Partida
            </CardTitle>
            <CardDescription>
              Preencha os dados da partida e os resultados de cada jogador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="matchDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Data da Partida
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} className="bg-surface-base border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Observações (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Mesa 5, LSC"
                            {...field}
                            className="bg-surface-base border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Jogadores ({fields.length})
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newPlacement = maxPlacement + 1;
                        const newPoints = Math.max(0, 10 - (newPlacement - 1) * 2);
                        append({ userId: '', placement: newPlacement, victoryPoints: newPoints });
                      }}
                      disabled={fields.length >= 6}
                      className="text-gold hover:text-gold hover:bg-gold/10"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border p-4 bg-surface-base/50">
                    {fields.map((field, index) => {
                      const selected = form.watch(`players.${index}.userId`);
                      return (
                        <div
                          key={field.id}
                          className="flex flex-col gap-3 rounded-lg border border-border/50 bg-surface-elevated p-4 sm:flex-row sm:items-end"
                        >
                          <FormField
                            control={form.control}
                            name={`players.${index}.userId`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="sm:hidden text-xs text-muted-foreground">Jogador</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-surface-base border-border">
                                      <SelectValue placeholder="Selecione jogador" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-surface-overlay border-border">
                                    {unusedPlayers
                                      .concat(
                                        availablePlayers.filter(
                                          (p) => p.userId === selected
                                        )
                                      )
                                      .map((player) => (
                                        <SelectItem
                                          key={player.userId}
                                          value={player.userId}
                                        >
                                          {player.nickname} ({player.fullName})
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
                            name={`players.${index}.placement`}
                            render={({ field }) => (
                              <FormItem className="w-24">
                                <FormLabel className="sm:hidden text-xs text-muted-foreground">Colocação</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={6}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value) || 0)
                                    }
                                    className="bg-surface-base border-border text-center"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`players.${index}.victoryPoints`}
                            render={({ field }) => (
                              <FormItem className="w-24">
                                <FormLabel className="sm:hidden text-xs text-muted-foreground">Pontos</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={30}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value) || 0)
                                    }
                                    className="bg-surface-base border-border text-center"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 2}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {form.formState.errors.players?.message && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.players.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar Partida'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}