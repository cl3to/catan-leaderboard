import type { Metadata } from 'next';
import { Bree_Serif, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';

const displayFont = Bree_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
});

const bodyFont = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'LSC - Liga Socialista do Catan',
  description:
    'Leaderboard oficial da Liga Socialista do Catan (LSC), com ranking competitivo, calendario e partidas em tempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
