import { Leaderboard } from '@/components/leaderboard/leaderboard';
import { Metadata } from 'next';
import { Trophy, Crown, Scroll, Castle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leaderboard - Liga Socialista do Catan',
};

export default function HomePage() {
  return (
    <main className="catan-app">
      <div className="catan-shell">
        <section className="catan-hero flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-slide-up">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-2xl flex items-center justify-center shadow-glow border border-gold-light/20">
              <Trophy className="w-8 h-8 text-background" />
            </div>
            <div>
              <h1 className="title-ornate">Liga Socialista do Catan</h1>
              <p className="subtitle mt-1">Conselho dos Colonizadores - Temporada 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">Meta</p>
              <p className="font-display font-semibold text-gold flex items-center gap-1.5">
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