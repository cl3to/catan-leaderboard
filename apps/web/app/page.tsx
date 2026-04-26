import { Leaderboard } from '@/components/leaderboard/leaderboard';
import { Metadata } from 'next';
import { Pickaxe, Shield, Trophy, Wheat } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leaderboard - Liga Socialista do Catan',
};

export default function HomePage() {
  return (
    <main className="catan-app">
      <div className="catan-shell space-y-5 pb-10 pt-3 sm:space-y-6 sm:pt-4">
        <section className="catan-hero animate-rise">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="shield-emblem hidden h-14 w-14 shrink-0 items-center justify-center rounded-lg sm:flex">
                <span className="text-2xl">🏰</span>
              </div>
              <div className="max-w-3xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="catan-label bg-white/15 text-white">Temporada 2026</span>
                </div>
                <h1 className="font-display text-3xl leading-tight text-white sm:text-4xl md:text-5xl">
                  Liga Socialista do Catan
                </h1>
                <p className="max-w-2xl text-sm text-white/90 sm:text-base">
                  O LSC agora é a Liga Socialista do Catan: o ranking oficial das mesas, com disputa por
                  território, pontos de vitória e glória na república dos hexágonos.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="lsc-button">
                LSC × CATAN
              </div>
              <div className="flex gap-2">
                <div className="hex-resource h-6 w-6 bg-[#8B4513] text-[10px] text-white flex items-center justify-center" title="Madeira">🪵</div>
                <div className="hex-resource h-6 w-6 bg-[#B22222] text-[10px] text-white flex items-center justify-center" title="Argila">🧱</div>
                <div className="hex-resource h-6 w-6 bg-[#90EE90] text-[10px] text-[#3d2e22] flex items-center justify-center" title="Ovelha">🐑</div>
                <div className="hex-resource h-6 w-6 bg-[#FFD700] text-[10px] text-[#3d2e22] flex items-center justify-center" title="Trigo">🌾</div>
                <div className="hex-resource h-6 w-6 bg-[#696969] text-[10px] text-white flex items-center justify-center" title="Minério">🪨</div>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-3">
            <div className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">Meta da rodada</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <Trophy className="h-4 w-4" /> conquistar 10 PV
              </p>
            </div>
            <div className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">Tema</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <Pickaxe className="h-4 w-4" /> estratégia de recursos
              </p>
            </div>
            <div className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-sm">
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
              <h2 className="font-display text-2xl text-[#3d2e22]">Ranking da Liga</h2>
              <p className="text-sm text-[#7a6a5a]">
                Classificação viva da Liga Socialista do Catan por categoria e período.
              </p>
            </div>
          </div>
          <Leaderboard />
        </section>

        <footer className="py-6 text-center">
          <p className="font-display italic text-[#3d2e22]">
            <Wheat className="mr-2 inline h-4 w-4" />
            LSC: Onde o Trigo é de Todos, mas as Estradas são Nossas!
          </p>
        </footer>
      </div>
    </main>
  );
}