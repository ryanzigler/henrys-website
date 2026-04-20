import '@/app/globals.css';
import { UserPill } from '@/components/auth/UserPill';
import type { Metadata } from 'next';
import { Manrope, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Henry's Website",
  description: 'Stuff Henry made',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
    <body className="relative min-h-screen bg-sky-50 font-sans">
      <div className="root">
        <header className="flex items-center justify-end p-4">
          <UserPill />
        </header>
        {children}
      </div>
    </body>
  </html>
);

export default RootLayout;
