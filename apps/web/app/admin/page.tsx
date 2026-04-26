'use client';

import * as React from 'react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Users, Swords, Check, X, Search, Loader2 } from 'lucide-react';

interface Submission {
  id: string;
  matchDate: string;
  notes: string;
  status: string;
  createdAt: string;
  players: Array<{
    userId: string;
    nickname: string;
    placement: number;
    victoryPoints: number;
  }>;
}

interface User {
  userId: string;
  email: string;
  nickname: string;
  fullName: string;
  category: string;
  isActive: boolean;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  };

  React.useEffect(() => {
    async function fetchSubmissions() {
      if (status !== 'authenticated') return;
      if (!session?.user?.role || session.user.role !== 'admin') return;

      try {
        const res = await fetch('/api/v1/admin/submissions', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setSubmissions(Array.isArray(data) ? data : data.data || []);
        }
      } catch (e) {
        console.error('Failed to fetch submissions:', e);
      } finally {
        setLoading(false);
      }
    }

    async function fetchUsers() {
      if (status !== 'authenticated') return;
      if (!session?.user?.role || session.user.role !== 'admin') return;

      try {
        const res = await fetch('/api/v1/admin/users', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setUsers(Array.isArray(data) ? data : data.data || []);
        }
      } catch (e) {
        console.error('Failed to fetch users:', e);
      } finally {
        setUsersLoading(false);
      }
    }

    if (status === 'authenticated' && session?.user) {
      fetchSubmissions();
      fetchUsers();
    }
  }, [status, session]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/admin/submissions/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast({ title: 'Partida aprovada!' });
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      } else {
        const error = await res.json();
        throw new Error(error.message);
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/admin/submissions/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast({ title: 'Partida rejeitada!' });
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      } else {
        const error = await res.json();
        throw new Error(error.message);
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUser = async (userId: string, isActive: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        toast({ title: isActive ? 'Usuário desativado' : 'Usuário ativado' });
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === userId ? { ...u, isActive: !isActive } : u
          )
        );
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (status === 'loading') {
    return (
      <main className="catan-app">
        <div className="catan-shell py-10 text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto text-gold" />
        </div>
      </main>
    );
  }

  if (status !== 'authenticated') {
    return (
      <main className="catan-app">
        <div className="catan-shell py-10 text-center">
          <p className="text-muted-foreground">Faça login para acessar o admin.</p>
        </div>
      </main>
    );
  }

  if (session?.user?.role !== 'admin') {
    return (
      <main className="catan-app">
        <div className="catan-shell py-10 text-center">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </main>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      (u.nickname?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.fullName?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <main className="catan-app">
      <div className="catan-shell space-y-6 py-6">
        <section className="catan-hero animate-slide-up">
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="catan-label">Administração</span>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl text-foreground">
              Painel Admin
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Gerencie partidas pendentes e jogadores.
            </p>
          </div>
        </section>

        <Tabs defaultValue="matches" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-surface-base p-1 border border-border">
            <TabsTrigger
              value="matches"
              className="gap-2 rounded-lg data-[state=active]:bg-gold/20 data-[state=active]:text-gold"
            >
              <Swords className="h-4 w-4" />
              Partidas
            </TabsTrigger>
            <TabsTrigger
              value="players"
              className="gap-2 rounded-lg data-[state=active]:bg-gold/20 data-[state=active]:text-gold"
            >
              <Users className="h-4 w-4" />
              Jogadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-4">
            <Card className="catan-panel border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Partidas Pendentes</CardTitle>
                <CardDescription>Aprovar ou rejeitar partidas submetidas.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin h-6 w-6 text-gold" />
                  </div>
                ) : submissions.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Nenhuma partida pendente.</p>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-surface-base/50 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {new Date(sub.matchDate).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm text-muted-foreground">{sub.notes || 'Sem observações'}</p>
                            <p className="text-xs text-muted-foreground">
                              Criada em {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(sub.id)}
                              disabled={actionLoading === sub.id}
                              className="border-border"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(sub.id)}
                              disabled={actionLoading === sub.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sub.players.map((p) => (
                            <span
                              key={p.userId}
                              className="inline-flex items-center rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs"
                            >
                              {p.nickname} - {p.placement}º ({p.victoryPoints} pts)
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <Card className="catan-panel border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Jogadores</CardTitle>
                <CardDescription>Gerenciar usuários do sistema.</CardDescription>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar jogador..."
                    className="pl-9 bg-surface-base border-border"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin h-6 w-6 text-gold" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Nenhum jogador encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface-base/50 p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">{user.nickname}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.fullName} ({user.category})
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={user.isActive ? 'destructive' : 'default'}
                          onClick={() => handleToggleUser(user.userId, user.isActive)}
                          disabled={actionLoading === user.userId}
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}