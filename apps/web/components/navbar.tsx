'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Trophy, Calendar, Swords } from 'lucide-react';
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

interface NavbarProfile {
  nickname: string;
  avatarMode?: string;
  avatarKey?: string;
  avatarUrl?: string;
  email?: string;
}

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  };

  const { data: profile } = useQuery<NavbarProfile>({
    queryKey: ['navbar-profile'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users/me', { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
  });

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  const renderAvatar = () => {
    const avatarMode = profile?.avatarMode;
    const avatarKey = profile?.avatarKey;
    const avatarUrl = profile?.avatarUrl;
    const nickname = session?.user?.nickname || profile?.nickname || '?';

    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="h-9 w-9 rounded-full object-cover"
        />
      );
    }

    if (avatarMode === 'preset' && avatarKey && avatarPresets[avatarKey]) {
      const preset = avatarPresets[avatarKey];
      return (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{ background: preset.color + '30' }}
        >
          {preset.icon}
        </div>
      );
    }

    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-catan-brick to-catan-wood text-sm font-bold text-white shadow-md">
        {nickname.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-40 px-3 py-3 sm:px-4">
      <div className="catan-shell">
        <div className="catan-panel overflow-hidden border-[1.5px] bg-card/95">
          <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
            <Link href="/" className="group flex items-center gap-3">
              <span className="hex-badge text-[11px] tracking-widest">LSC</span>
              <div>
                <p className="font-display text-base leading-none text-catan-wood sm:text-lg">
                  Liga Socialista do Catan
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  ranking da mesa revolucionaria
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {status === 'loading' ? (
                <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
              ) : session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border p-0">
                      {renderAvatar()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60 border-border/70 bg-card" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-semibold">{profile?.nickname || session.user.nickname}</p>
                        <p className="w-[210px] truncate text-sm text-muted-foreground">{profile?.email || session.user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                        <User className="h-4 w-4" />
                        Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Minhas estatisticas
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="rounded-full px-4">
                  <Link href="/login">Entrar</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto border-t border-border/80 px-3 py-2 sm:px-5">
            <Link
              href="/"
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                pathname === '/'
                  ? 'border-catan-brick/70 bg-catan-brick text-white'
                  : 'border-border bg-secondary/80 text-secondary-foreground hover:bg-secondary'
              )}
            >
              Leaderboard
            </Link>
            <Link
              href="/calendar"
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                pathname === '/calendar'
                  ? 'border-catan-ocean/70 bg-catan-ocean text-white'
                  : 'border-border bg-secondary/80 text-secondary-foreground hover:bg-secondary'
              )}
            >
              <Calendar className="h-3.5 w-3.5" /> Calendario
            </Link>
            {status === 'authenticated' && session?.user && (
              <>
                <Link
                  href="/submit"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                    pathname === '/submit'
                      ? 'border-catan-wheat/70 bg-catan-wheat text-catan-ore'
                      : 'border-border bg-secondary/80 text-secondary-foreground hover:bg-secondary'
                  )}
                >
                  <Swords className="h-3.5 w-3.5" /> Enviar partida
                </Link>
                {session.user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                      pathname?.startsWith('/admin')
                        ? 'border-catan-sheep/70 bg-catan-sheep text-white'
                        : 'border-catan-sheep/50 bg-catan-sheep/15 text-catan-sheep hover:bg-catan-sheep/20'
                    )}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
