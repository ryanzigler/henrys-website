import type { Metadata } from 'next';
import { UserPill } from '@/components/auth/UserPill';
import './globals.css';

export const metadata: Metadata = {
  title: "Henry's Website",
  description: 'Stuff Henry made',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sky-50">
        <header className="flex items-center justify-end p-4">
          <UserPill />
        </header>
        {children}
      </body>
    </html>
  );
}
