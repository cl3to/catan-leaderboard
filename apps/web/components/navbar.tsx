'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, LogOut, Calendar, Scroll, Hexagon } from 'lucide-react';

const avatarPresets: Record<string, { icon: string }> = {
  wood: { icon: '🪵' }, brick: { icon: '🧱' }, sheep: { icon: '🐑' },
  wheat: { icon: '🌾' }, ore: { icon: '🪨' }, desert: { icon: '🏜️' },
  settlement: { icon: '🏠' }, city: { icon: '🏰' }, road: { icon: '🛤️' },
  robber: { icon: '🏴' }, dice: { icon: '🎲' }, port: { icon: '⚓' },
  knight: { icon: '🛡️' }, vp: { icon: '⭐' }, trade: { icon: '⚖️' },
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

  const { data: profile } = useQuery<NavbarProfile>({
    queryKey: ['navbar-profile'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users/me');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: status === 'authenticated',
  });

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  const renderAvatar = () => {
    if (profile?.avatarUrl) {
      return <img src={profile.avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gold/30" />;
    }
    if (profile?.avatarMode === 'preset' && profile.avatarKey && avatarPresets[profile.avatarKey]) {
      return (
        <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center border border-gold/20">
          {avatarPresets[profile.avatarKey].icon}
        </div>
      );
    }
    const initial = session?.user?.nickname?.[0] || profile?.nickname?.[0] || '?';
    return (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-background text-xs font-bold border border-gold-light/30">
        {initial.toUpperCase()}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface-base/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform duration-200">
              <Hexagon className="w-5 h-5 text-background" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-semibold text-foreground">LSC</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">Catan</span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/calendar"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === '/calendar'
                  ? 'bg-gold/15 text-gold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1.5" />
              Calendário
            </Link>
            {status === 'authenticated' && (
              <>
                <Link
                  href="/submit"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    pathname === '/submit'
                      ? 'bg-gold/15 text-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <Scroll className="w-4 h-4 inline mr-1.5" />
                  Partida
                </Link>
                {session.user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      pathname === '/admin'
                        ? 'bg-gold/15 text-gold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <div className="w-9 h-9 bg-surface-elevated rounded-lg animate-pulse" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 p-1 rounded-xl hover:bg-surface-elevated">
                    {renderAvatar()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-surface-elevated border-border p-1">
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="font-medium text-foreground">{profile?.nickname || session.user.nickname}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{profile?.email || session.user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild className="text-muted-foreground hover:text-foreground hover:bg-surface-overlay cursor-pointer rounded-lg mx-1 my-1">
                    <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2">
                      <User className="w-4 h-4" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30 cursor-pointer rounded-lg mx-1 my-1"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                className="bg-gradient-to-r from-gold to-gold-dark text-background font-semibold hover:from-gold-light hover:to-gold shadow-glow"
              >
                <Link href="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}