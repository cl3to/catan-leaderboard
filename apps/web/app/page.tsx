import { Leaderboard } from '@/components/leaderboard/leaderboard';
import { Metadata } from 'next';
import { Pickaxe, Shield, Trophy } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leaderboard - Liga Socialista do Catan',
};

export default function HomePage() {
  return (
    <main className="catan-app">
      <div className="catan-shell space-y-5 pb-10 pt-3 sm:space-y-6 sm:pt-4">
        <section className="catan-hero animate-rise">
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="catan-label bg-white/15 text-white">Temporada 2026</span>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
              Liga Socialista do Catan
            </h1>
            <p className="max-w-2xl text-sm text-white/90 sm:text-base">
              O LSC agora e a Liga Socialista do Catan: o ranking oficial das mesas, com disputa por
              territorio, pontos de vitoria e gloria na republica dos hexagonos.
            </p>
          </div>
          <div className="relative z-10 mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-3">
            <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">Meta da rodada</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <Trophy className="h-4 w-4" /> conquistar 10 PV
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">Tema</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <Pickaxe className="h-4 w-4" /> estrategia de recursos
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">Luta de classes</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <Shield className="h-4 w-4" /> cooperar para competir
              </p>
            </div>
          </div>
        </section>

        <section className="catan-panel border-[1.5px] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-catan-wood">Ranking da Liga</h2>
              <p className="text-sm text-muted-foreground">
                Classificacao viva da Liga Socialista do Catan por categoria e periodo.
              </p>
            </div>
          </div>
          <Leaderboard />
        </section>
      </div>
    </main>
  );
}
