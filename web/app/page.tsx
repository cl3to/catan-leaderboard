import { Leaderboard } from '@/components/leaderboard/leaderboard';
import { Metadata } from 'next';
import { Crown, Scroll, Castle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leaderboard - Liga Socialista do Catan',
};

function LscEmblem() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-gold bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.98),rgba(250,241,222,0.97)_55%,rgba(233,214,171,0.97))] shadow-[0_14px_34px_rgba(130,90,30,0.18)]">
      <div className="absolute inset-2 rounded-[1.05rem] border border-gold/40" />
      <div className="absolute inset-0 rounded-[1.35rem] ring-1 ring-inset ring-white/60" />
      <span
        className="relative z-10 select-none text-[2.1rem] leading-none text-social-red-dark drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]"
        aria-hidden="true"
      >
        ☭
      </span>
      <span className="absolute bottom-1.5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-forest/25 bg-white/75 px-1.5 py-0.5 text-[0.42rem] font-bold uppercase tracking-[0.18em] text-forest-dark">
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/70 px-3.5 py-1.5 text-sm shadow-sm">
              <Crown className="w-4 h-4 text-gold-dark" />
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Meta</span>
              <span className="font-display font-bold text-foreground num-tabular">10 PV</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-white/70 px-3.5 py-1.5 text-sm shadow-sm">
              <Scroll className="w-4 h-4 text-primary" />
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tema</span>
              <span className="font-display font-semibold text-foreground">Recursos</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3.5 py-1.5 text-sm shadow-sm">
              <Castle className="w-4 h-4 text-muted-foreground" />
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Doutrina</span>
              <span className="font-display font-semibold text-foreground">Cooperação</span>
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
