import './globals.css';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CRAudioVizAI Games Pack - 25+ Micro-Games & Extreme Challenges',
  description: 'Play 25+ micro-games for free, upgrade for premium modes and exclusive Extreme challenges. Built by CRAudioVizAI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
              {/* Javari AI Assistant */}
        <Script src="https://javariai.com/embed.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
