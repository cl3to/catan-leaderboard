'use client';

import { useSession } from 'next-auth/react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { Shield, Trophy } from 'lucide-react';

export default function LoginPage() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <main className="catan-app">
        <div className="catan-shell grid min-h-[calc(100vh-7rem)] items-center gap-4 py-4 sm:py-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="animate-slide-up" style={{ animationDelay: '90ms' }}>
            <div className="catan-panel mx-auto w-full max-w-lg p-10 text-center">
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-elevated mx-auto" />
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }

  return (
    <main className="catan-app">
      <div className="catan-shell grid min-h-[calc(100vh-7rem)] items-center gap-4 py-4 sm:py-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="catan-hero animate-slide-up hidden lg:block">
          <div className="relative z-10 max-w-xl space-y-5">
            <span className="catan-label">Acesso de jogador</span>
            <h1 className="font-display text-4xl leading-tight text-foreground">
              Entre na Liga Socialista do Catan
            </h1>
            <p className="text-foreground/80 text-base leading-relaxed">
              Registre resultados, acompanhe o ranking em tempo real e escale no tabuleiro político de Catan.
            </p>
            <div className="grid gap-3 pt-2">
              <div className="rounded-2xl border border-social-red/20 bg-social-red-soft/80 px-5 py-4">
                <p className="flex items-center gap-3 font-semibold text-foreground">
                  <Shield className="h-5 w-5 text-social-red" />
                  Comunidade competitiva e cooperativa
                </p>
              </div>
              <div className="rounded-2xl border border-social-red/20 bg-social-red-soft/80 px-5 py-4">
                <p className="flex items-center gap-3 font-semibold text-foreground">
                  <Trophy className="h-5 w-5 text-social-red" />
                  Ranking oficial da temporada
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-slide-up" style={{ animationDelay: '90ms' }}>
          <AuthPanel />
        </section>
      </div>
    </main>
  );
}
