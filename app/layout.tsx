import '@/app/globals.css';
import { UserPill } from '@/components/auth/UserPill';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: "Henry's Website",
  description: 'Stuff Henry made',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body className="relative min-h-screen bg-sky-50">
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
