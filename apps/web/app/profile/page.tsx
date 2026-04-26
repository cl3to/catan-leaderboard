'use client';

import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, Trophy, Swords, TrendingUp, Calendar, Award, Edit2, LogOut, Key, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AvatarPicker } from '@/components/profile/avatar-picker';
import { users } from '@/lib/api';
import { cn } from '@/lib/utils';

const avatarPresets: Record<string, { icon: string; color: string }> = {
  wood: { icon: '🪵', color: '#8B4513' },
  brick: { icon: '🧱', color: '#B22222' },
  sheep: { icon: '🐑', color: '#90EE90' },
  wheat: { icon: '🌾', color: '#FFD700' },
  ore: { icon: '🪨', color: '#696969' },
  desert: { icon: '🏜️', color: '#F4A460' },
  settlement: { icon: '🏠', color: '#4A90D9' },
  city: { icon: '🏰', color: '#9B59B6' },
  road: { icon: '🛤️', color: '#8B4513' },
  robber: { icon: '🏴', color: '#2C3E50' },
  dice: { icon: '🎲', color: '#E74C3C' },
  port: { icon: '⚓', color: '#3498DB' },
  knight: { icon: '🛡️', color: '#95A5A6' },
  vp: { icon: '⭐', color: '#F1C40F' },
  trade: { icon: '⚖️', color: '#1ABC9C' },
};

interface PlayerStats {
  userId: string;
  nickname: string;
  fullName: string;
  category: string;
  totalPoints: number;
  wins: number;
  matches: number;
  rank: number;
  recentForm: string[];
}

interface ProfileData {
  userId: string;
  email: string;
  nickname: string;
  fullName: string;
  category: string;
  program?: string;
  bio?: string;
  avatarUrl?: string;
  avatarKey?: string;
  avatarMode?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  };

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users/me', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: status === 'authenticated',
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PlayerStats>({
    queryKey: ['player-stats'],
    queryFn: async () => {
      if (!session?.user?.id) throw new Error('Not authenticated');
      const res = await fetch(`/api/v1/leaderboard/${session.user.id}/stats`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: status === 'authenticated' && !!session?.user?.id,
  });

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
          <p className="text-muted-foreground">Faça login para ver seu perfil.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="catan-app">
      <div className="catan-shell space-y-6 py-6">
        <section className="catan-hero animate-slide-up">
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="catan-label">Perfil</span>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl text-foreground">
              Meu Perfil
            </h1>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="catan-panel border-border">
            <CardHeader className="space-y-4">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5 text-gold" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <Loader2 className="animate-spin h-6 w-6 text-gold" />
              ) : profile ? (
                <>
                  <div className="flex items-center gap-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="group relative flex cursor-pointer items-center justify-center">
                          {profile.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt="Avatar"
                              className="h-16 w-16 rounded-full object-cover border border-gold/30"
                            />
                          ) : profile.avatarMode === 'preset' && profile.avatarKey && avatarPresets[profile.avatarKey] ? (
                            <div
                              className="flex h-16 w-16 items-center justify-center rounded-full text-3xl border border-gold/30"
                              style={{ background: avatarPresets[profile.avatarKey].color + '30' }}
                            >
                              {avatarPresets[profile.avatarKey].icon}
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-2xl font-bold text-background transition-transform group-hover:scale-105">
                              {profile.nickname?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <Edit2 className="h-5 w-5 text-white" />
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md bg-surface-elevated border-border">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Escolher Avatar</DialogTitle>
                          <DialogDescription>
                            Selecione um avatar temático do Catan ou carregue uma imagem.
                          </DialogDescription>
                        </DialogHeader>
                        <AvatarPicker />
                      </DialogContent>
                    </Dialog>
                    <div>
                      <p className="text-xl font-semibold text-foreground">{profile.nickname}</p>
                      <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-foreground">{profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria</span>
                      <span className="text-foreground capitalize">{profile.category}</span>
                    </div>
                    {profile.program && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Curso</span>
                        <span className="text-foreground">{profile.program}</span>
                      </div>
                    )}
                    {profile.bio && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bio</span>
                        <span className="text-foreground">{profile.bio}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 border-border hover:bg-surface-base">
                          <Edit2 className="h-4 w-4" /> Editar Perfil
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md bg-surface-elevated border-border">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Editar Perfil</DialogTitle>
                          <DialogDescription>
                            Atualize suas informações pessoais.
                          </DialogDescription>
                        </DialogHeader>
                        <ProfileEditForm profile={profile} />
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 border-border hover:bg-surface-base">
                          <Key className="h-4 w-4" /> Alterar Senha
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md bg-surface-elevated border-border">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Alterar Senha</DialogTitle>
                          <DialogDescription>
                            Defina uma nova senha para sua conta.
                          </DialogDescription>
                        </DialogHeader>
                        <PasswordChangeForm />
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 border-border">
                          <Trash2 className="h-4 w-4" /> Excluir Conta
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md bg-surface-elevated border-border">
                        <DialogHeader>
                          <DialogTitle className="text-red-400">Excluir Conta</DialogTitle>
                          <DialogDescription>
                            Esta ação não pode ser desfeita. Todos os seus dados serão removidos.
                          </DialogDescription>
                        </DialogHeader>
                        <DeleteAccountForm />
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground hover:text-foreground"
                      onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Erro ao carregar perfil</p>
              )}
            </CardContent>
          </Card>

          <Card className="catan-panel border-border">
            <CardHeader className="space-y-4">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Trophy className="h-5 w-5 text-gold" />
                Estatísticas
              </CardTitle>
              <CardDescription>
                Seu desempenho na Liga Socialista do Catan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="animate-spin h-6 w-6 text-gold" />
              ) : stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-surface-base p-4 text-center border border-border">
                    <Trophy className="mx-auto h-6 w-6 text-gold mb-2" />
                    <p className="text-2xl font-display font-bold text-gold">{stats.rank}º</p>
                    <p className="text-xs text-muted-foreground">Posição</p>
                  </div>
                  <div className="rounded-xl bg-surface-base p-4 text-center border border-border">
                    <Award className="mx-auto h-6 w-6 text-gold mb-2" />
                    <p className="text-2xl font-display font-bold text-foreground">{stats.totalPoints}</p>
                    <p className="text-xs text-muted-foreground">Pontos</p>
                  </div>
                  <div className="rounded-xl bg-surface-base p-4 text-center border border-border">
                    <Swords className="mx-auto h-6 w-6 text-gold mb-2" />
                    <p className="text-2xl font-display font-bold text-foreground">{stats.wins}</p>
                    <p className="text-xs text-muted-foreground">Vitórias</p>
                  </div>
                  <div className="rounded-xl bg-surface-base p-4 text-center border border-border">
                    <TrendingUp className="mx-auto h-6 w-6 text-emerald-400 mb-2" />
                    <p className="text-2xl font-display font-bold text-emerald-400">
                      {stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Taxa Vitória</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma estatística ainda</p>
              )}
            </CardContent>
          </Card>

          {stats && stats.recentForm && stats.recentForm.length > 0 && (
            <Card className="catan-panel border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-gold" />
                  Desempenho Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.recentForm.map((result, i) => (
                    <span
                      key={i}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold',
                        result === 'W'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-surface-base text-muted-foreground border border-border'
                      )}
                    >
                      {result}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  W = Vitória, L = Derrota
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function ProfileEditForm({ profile }: { profile: ProfileData }) {
  const [formData, setFormData] = React.useState({
    fullName: profile.fullName || '',
    nickname: profile.nickname || '',
    bio: profile.bio || '',
    program: profile.program || '',
  });
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => users.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setMessage('Perfil atualizado!');
      setSaving(false);
    },
    onError: () => {
      setMessage('Erro ao atualizar');
      setSaving(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome completo</label>
        <Input
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className="bg-surface-base border-border"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apelido</label>
        <Input
          value={formData.nickname}
          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          className="bg-surface-base border-border"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Curso</label>
        <Input
          value={formData.program}
          onChange={(e) => setFormData({ ...formData, program: e.target.value })}
          className="bg-surface-base border-border"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bio</label>
        <Input
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="bg-surface-base border-border"
        />
      </div>
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
      </Button>
    </form>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const mutation = useMutation({
    mutationFn: ({ current, new: newP }: { current: string; new: string }) =>
      users.changePassword(current, newP),
    onSuccess: () => {
      setMessage('Senha alterada!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaving(false);
    },
    onError: (err: any) => {
      setError(err.message || 'Erro ao alterar senha');
      setSaving(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSaving(true);
    mutation.mutate({ current: currentPassword, new: newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha atual</label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="bg-surface-base border-border"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nova senha</label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-surface-base border-border"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmar senha</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-surface-base border-border"
        />
      </div>
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Alterar Senha'}
      </Button>
    </form>
  );
}

function DeleteAccountForm() {
  const [confirmText, setConfirmText] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const mutation = useMutation({
    mutationFn: () => users.deleteMe(),
    onSuccess: () => {
      signOut({ callbackUrl: '/login' });
    },
    onError: (err: any) => {
      setMessage(err.message || 'Erro ao excluir conta');
      setSaving(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'EXCLUIR') return;
    setSaving(true);
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Para confirmar, digite <strong className="text-foreground">EXCLUIR</strong> abaixo:
      </p>
      <div className="space-y-2">
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="EXCLUIR"
          className="bg-surface-base border-border"
        />
      </div>
      {message && <p className="text-sm text-red-400">{message}</p>}
      <Button
        type="submit"
        disabled={saving || confirmText !== 'EXCLUIR'}
        className="w-full bg-red-500 hover:bg-red-600"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir Minha Conta'}
      </Button>
    </form>
  );
}