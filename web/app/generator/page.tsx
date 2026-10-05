import type { Metadata } from 'next';
import { Hexagon } from 'lucide-react';
import { CatanBoardGenerator } from '@/components/generator/catan-board-generator';

export const metadata: Metadata = {
  title: 'Gerador de Tabuleiro - Liga Socialista do Catan',
  description:
    'Embaralhe tabuleiros justos de Catan no modo clássico ou na expansão de 5–6 jogadores, seguindo as regras da casa da LSC.',
};

export default function GeneratorPage() {
  return (
    <main className="catan-app">
      <div className="catan-shell space-y-5 pb-10 pt-3 sm:space-y-6 sm:pt-4">
        <section className="catan-hero animate-slide-up">
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="catan-label inline-flex items-center gap-1.5">
              <Hexagon className="h-3.5 w-3.5" />
              Ferramenta da Liga
            </span>
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
              Gerador de Tabuleiros
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Embaralhe tabuleiros justos de Catan no modo clássico ou na expansão de 5–6 jogadores,
              seguindo as regras da casa da Liga.
            </p>
          </div>
        </section>

        <CatanBoardGenerator />
      </div>
    </main>
  );
}
