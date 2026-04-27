import { Leaderboard } from '@/components/leaderboard/leaderboard';
import { Metadata } from 'next';
import { Crown, Scroll, Castle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leaderboard - Liga Socialista do Catan',
};

function LscEmblem() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-social-red/25 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.96),rgba(248,231,205,0.95)_55%,rgba(229,198,149,0.96))] shadow-[0_18px_40px_rgba(120,48,35,0.16)]">
      <div className="absolute inset-2 rounded-[1.05rem] border border-social-red/10" />
      <div className="absolute inset-0 rounded-[1.35rem] ring-1 ring-inset ring-white/55" />
      <span
        className="relative z-10 select-none text-[2.1rem] leading-none text-social-red-dark drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]"
        aria-hidden="true"
      >
        ☭
      </span>
      <span className="absolute bottom-1.5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-social-red/20 bg-white/70 px-1.5 py-0.5 text-[0.42rem] font-bold uppercase tracking-[0.18em] text-social-red-dark">
        LSC
      </span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="catan-app">
      <div className="catan-shell">
        <section className="catan-hero flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-slide-up">
          <div className="flex items-center gap-5 relative z-10">
            <LscEmblem />
            <div>
              <h1 className="title-ornate">Liga Socialista do Catan</h1>
              <p className="subtitle mt-1">Conselho dos Colonizadores · Temporada 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Meta</p>
              <p className="font-display font-semibold text-social-red flex items-center gap-1.5">
                <Crown className="w-4 h-4" /> 10 PV
              </p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Tema</p>
              <p className="font-display font-semibold text-foreground flex items-center gap-1.5">
                <Scroll className="w-4 h-4 text-muted-foreground" /> Recursos
              </p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Doutrina</p>
              <p className="font-display font-semibold text-foreground flex items-center gap-1.5">
                <Castle className="w-4 h-4 text-muted-foreground" /> Cooperação
              </p>
            </div>
          </div>
        </section>

        <Leaderboard />

        <footer className="footer-scroll mt-8 text-sm border-t border-border pt-6">
          O trigo é do povo, mas as estradas pertencem aos colonos.
          <br />
          <span className="text-xs">LSC • Laboratório de Sistemas de Computação • IC • UNICAMP</span>
        </footer>
      </div>
    </main>
  );
}
