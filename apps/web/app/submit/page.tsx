'use client';

import * as React from 'react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useController, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { Plus, X, Swords, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { users } from '@/lib/api';
import {
  toIsoFromSaoPauloLocalValue,
  toSaoPauloDateTimeLocalValue,
} from '@/lib/time';

interface Player {
  userId: string;
  email: string;
  nickname: string;
  fullName: string;
}

const playerSchema = z.object({
  userId: z.string().min(1, 'Selecione um jogador'),
  placement: z.number().min(1).max(6),
  victoryPoints: z.number().min(0).max(10),
});

const submitMatchSchema = z.object({
  matchDate: z.string().min(1, 'Data é obrigatória'),
  notes: z.string().optional(),
  players: z
    .array(playerSchema)
    .min(2, 'Mínimo de 2 jogadores')
    .max(6, 'Máximo de 6 jogadores'),
}).superRefine((data, ctx) => {
  const winners = data.players.filter((player) => player.victoryPoints === 10);

  if (data.players.some((player) => player.victoryPoints > 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['players'],
      message: 'Nenhum jogador pode ter mais de 10 pontos',
    });
  }

  if (winners.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['players'],
      message: 'A partida deve ter exatamente um jogador com 10 pontos',
    });
  }
});

type SubmitMatchValues = z.infer<typeof submitMatchSchema>;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scorePlayer(player: Player, query: string) {
  const normalizedQuery = normalizeText(query.trim());
  if (!normalizedQuery) return 1;

  const nickname = normalizeText(player.nickname);
  const fullName = normalizeText(player.fullName);
  const email = normalizeText(player.email);
  const haystack = `${nickname} ${fullName} ${email}`;

  if (email === normalizedQuery || nickname === normalizedQuery || fullName === normalizedQuery) {
    return 100;
  }

  if (nickname.startsWith(normalizedQuery)) return 95;
  if (fullName.startsWith(normalizedQuery)) return 90;
  if (email.startsWith(normalizedQuery)) return 85;

  let score = 0;
  for (const token of normalizedQuery.split(/\s+/).filter(Boolean)) {
    if (nickname.includes(token)) score += 7;
    if (fullName.includes(token)) score += 6;
    if (email.includes(token)) score += 5;
    if (haystack.includes(token)) score += 2;
  }

  return score;
}

function formatPlayerLabel(player: Player) {
  return `${player.nickname} · ${player.fullName} · ${player.email}`;
}

function PlayerSearchField({
  control,
  index,
  players,
  usedPlayerIds,
}: {
  control: ReturnType<typeof useForm<SubmitMatchValues>>['control'];
  index: number;
  players: Player[];
  usedPlayerIds: string[];
}) {
  const { field, fieldState } = useController({
    control,
    name: `players.${index}.userId`,
  });
  const currentRow = useWatch({ control, name: `players.${index}` });
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const selectedPlayer = React.useMemo(
    () => players.find((player) => player.userId === field.value) || null,
    [field.value, players]
  );

  React.useEffect(() => {
    if (selectedPlayer) {
      setQuery(formatPlayerLabel(selectedPlayer));
    } else if (!open) {
      setQuery('');
    }
  }, [selectedPlayer, open]);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  const options = React.useMemo(() => {
    const currentId = field.value;
    const scored = players
      .filter((player) => !usedPlayerIds.includes(player.userId) || player.userId === currentId)
      .map((player) => ({ player, score: scorePlayer(player, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.player.nickname.localeCompare(b.player.nickname));

    return query.trim() ? scored.slice(0, 6) : scored.slice(0, 8);
  }, [field.value, players, query, usedPlayerIds]);

  const selectPlayer = (player: Player) => {
    field.onChange(player.userId);
    setQuery(formatPlayerLabel(player));
    setOpen(false);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      const best = options[0];
      if (!field.value && query.trim() && best && best.score >= 20) {
        selectPlayer(best.player);
      }
      setOpen(false);
    }, 120);
  };

  const isWinnerRow = currentRow?.victoryPoints === 10;

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="space-y-1">
        <FormLabel className="sm:hidden text-xs text-muted-foreground flex items-center gap-2">
          <span>Jogador</span>
          {isWinnerRow && (
            <span className="rounded-full border border-social-red/30 bg-social-red-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-social-red">
              Vencedor
            </span>
          )}
        </FormLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              field.onChange('');
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            placeholder="Digite nome, apelido ou email"
            className="bg-surface-base border-border pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      {open && options.length > 0 && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface-overlay p-1 shadow-elevated">
          {options.map(({ player }) => {
            const selected = player.userId === field.value;
            return (
              <button
                key={player.userId}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectPlayer(player);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  selected ? 'bg-social-red-soft text-social-red' : 'hover:bg-surface-base'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{player.nickname}</span>
                  <span className="block truncate text-xs text-muted-foreground">{player.fullName} · {player.email}</span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-social-red" />}
              </button>
            );
          })}
        </div>
      )}

      {open && query.trim() && options.length === 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-surface-overlay p-3 text-sm text-muted-foreground shadow-elevated">
          Nenhum jogador encontrado
        </div>
      )}

      {fieldState.error && (
        <p className="mt-1 text-xs text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
}

export default function SubmitMatchPage() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);

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
      matchDate: toSaoPauloDateTimeLocalValue(new Date()),
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
        const data = (await users.searchPlayers()) as Player[];
        setAvailablePlayers(
          data.map((p) => ({
            userId: p.userId,
            email: p.email,
            nickname: p.nickname,
            fullName: p.fullName,
          }))
        );
      } catch (e) {
        console.error('Failed to fetch players:', e);
      }
    }
    if (status === 'authenticated') {
      fetchPlayers();
    }
  }, [status]);

  const selectedPlayers = form.watch('players').map((p) => p.userId).filter(Boolean);

  const maxPlacement = Math.max(...form.watch('players').map((p) => p.placement), 0);

  const onSubmit = async (values: SubmitMatchValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        matchDate: toIsoFromSaoPauloLocalValue(values.matchDate),
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
        matchDate: toSaoPauloDateTimeLocalValue(new Date()),
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
              <Swords className="h-5 w-5 text-social-red" />
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
                          className="text-social-red hover:text-social-red hover:bg-social-red-soft"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    A vitória vai para o primeiro jogador que atingir 10 pontos. O formulário bloqueia partidas com mais de um jogador em 10 pontos ou com pontuação acima de 10.
                  </p>

                  <div className="space-y-3 rounded-xl border border-border p-4 bg-surface-base/50">
                    {fields.map((field, index) => {
                      const victoryPoints = form.watch(`players.${index}.victoryPoints`);
                      const isWinnerRow = victoryPoints === 10;
                      return (
                        <div
                          key={field.id}
                          className={cn(
                            'flex flex-col gap-3 rounded-lg border bg-surface-elevated p-4 sm:flex-row sm:items-end',
                            isWinnerRow ? 'border-social-red/40 shadow-[0_0_0_1px_hsl(var(--social-red)_/_0.16)]' : 'border-border/50'
                          )}
                        >
                          <PlayerSearchField
                            control={form.control}
                            index={index}
                            players={availablePlayers}
                            usedPlayerIds={selectedPlayers.filter((id) => id !== form.getValues(`players.${index}.userId`))}
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
                                <FormLabel className="sm:hidden text-xs text-muted-foreground flex items-center gap-2">
                                  <span>Pontos</span>
                                  {isWinnerRow && (
                                    <span className="rounded-full border border-social-red/30 bg-social-red-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-social-red">
                                      Vencedor
                                    </span>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={10}
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(parseInt(e.target.value) || 0)
                                      }
                                      className="bg-surface-base border-border text-center"
                                  />
                                </FormControl>
                                {isWinnerRow && (
                                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-social-red">
                                    Linha vencedora
                                  </p>
                                )}
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

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-social-red px-4 text-white hover:text-white"
                  style={{ backgroundColor: 'hsl(var(--social-red-dark))', backgroundImage: 'none' }}
                  disabled={isSubmitting}
                >
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
