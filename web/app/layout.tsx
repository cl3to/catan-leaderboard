import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lsc-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
