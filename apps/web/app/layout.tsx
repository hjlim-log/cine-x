import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Toaster from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'CINE-X',
  description: '영화 예매 서비스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-zinc-950 text-white min-h-screen">
        <Navbar />
        <Toaster />
        <main>{children}</main>
      </body>
    </html>
  );
}
