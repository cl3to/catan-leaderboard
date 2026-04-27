'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { users } from '@/lib/api';
import { User, LogOut, Calendar, Scroll, Menu, Home } from 'lucide-react';

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

function NavbarEmblem() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-social-red/25 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.96),rgba(248,231,205,0.95)_55%,rgba(229,198,149,0.96))] shadow-[0_0_18px_hsl(var(--social-red)_/_0.18)] transition-transform duration-200 group-hover:scale-105">
      <div className="absolute inset-1.5 rounded-lg border border-social-red/10" />
      <span className="relative z-10 select-none text-xl leading-none text-social-red-dark" aria-hidden="true">
        ☭
      </span>
    </div>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const { data: profile } = useQuery<NavbarProfile>({
    queryKey: ['profile'],
    queryFn: () => users.getMe() as Promise<NavbarProfile>,
    enabled: status === 'authenticated',
  });

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  const renderAvatar = () => {
    if (profile?.avatarUrl) {
      return <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-social-red/30" />;
    }
    if (profile?.avatarMode === 'preset' && profile.avatarKey && avatarPresets[profile.avatarKey]) {
      return (
        <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center border border-social-red/20 text-base">
          {avatarPresets[profile.avatarKey].icon}
        </div>
      );
    }
    const initial = session?.user?.nickname?.[0] || profile?.nickname?.[0] || '?';
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-social-red to-social-red-dark flex items-center justify-center text-white text-sm font-bold border border-social-red/30">
        {initial.toUpperCase()}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface-base/95 backdrop-blur-md border-b border-social-red/10">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <NavbarEmblem />
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-semibold text-social-red">LSC</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">Catan</span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link
                href="/calendar"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname === '/calendar'
                    ? 'bg-social-red-soft text-social-red'
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
                      ? 'bg-social-red-soft text-social-red'
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
                        ? 'bg-social-red-soft text-social-red'
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden h-10 w-10 rounded-xl border-border bg-surface-elevated"
                  aria-label="Abrir menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-surface-elevated border-border p-1 sm:hidden">
                <DropdownMenuItem asChild className="rounded-lg mx-1 my-1">
                  <Link href="/" className="flex items-center gap-2.5 px-3 py-2">
                    <Home className="w-4 h-4" />
                    Início
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg mx-1 my-1">
                  <Link href="/calendar" className="flex items-center gap-2.5 px-3 py-2">
                    <Calendar className="w-4 h-4" />
                    Calendário
                  </Link>
                </DropdownMenuItem>
                {status === 'authenticated' && (
                  <>
                    <DropdownMenuItem asChild className="rounded-lg mx-1 my-1">
                      <Link href="/submit" className="flex items-center gap-2.5 px-3 py-2">
                        <Scroll className="w-4 h-4" />
                        Partida
                      </Link>
                    </DropdownMenuItem>
                    {session.user?.role === 'admin' && (
                      <DropdownMenuItem asChild className="rounded-lg mx-1 my-1">
                        <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2">
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem asChild className="rounded-lg mx-1 my-1">
                      <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2">
                        <User className="w-4 h-4" />
                        Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500 hover:text-red-600 hover:bg-red-100 cursor-pointer rounded-lg mx-1 my-1"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </>
                )}
                {status !== 'authenticated' && (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem asChild className="rounded-lg mx-1 my-1">
                      <Link href="/login" className="flex items-center gap-2.5 px-3 py-2">
                        Entrar
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {status === 'loading' ? (
              <div className="w-9 h-9 bg-surface-elevated rounded-lg animate-pulse" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12 w-12 p-1.5 rounded-xl hover:bg-surface-elevated">
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
                variant="outline"
                className="border-social-red px-4 font-semibold text-white hover:text-white"
                style={{ backgroundColor: 'hsl(var(--social-red-dark))', backgroundImage: 'none' }}
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
