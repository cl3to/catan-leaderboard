'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AuthPanel } from '@/components/auth/auth-panel';
import { Shield, Trophy } from 'lucide-react';

export default function LoginPage() {
  const { status } = useSession();

  if (status === 'authenticated') {
    redirect('/');
  }

  return (
    <main className="catan-app">
      <div className="catan-shell grid min-h-[calc(100vh-7rem)] items-center gap-4 py-4 sm:py-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="catan-hero animate-rise hidden lg:block">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="catan-label bg-white/15 text-white">Acesso de jogador</span>
            <h1 className="font-display text-4xl leading-tight">Entre na Liga Socialista do Catan</h1>
            <p className="text-white/90">
              Registre resultados, acompanhe o ranking em tempo real e escale no tabuleiro politico de
              Catan.
            </p>
            <div className="grid gap-2 pt-2">
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Shield className="h-4 w-4" /> Comunidade competitiva e cooperativa
                </p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Trophy className="h-4 w-4" /> Ranking oficial da temporada
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-rise" style={{ animationDelay: '90ms' }}>
          <AuthPanel />
        </section>
      </div>
    </main>
  );
}
