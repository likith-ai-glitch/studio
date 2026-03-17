import type { Metadata } from 'next';
import '@/app/globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { QuoteSheet } from '@/components/quote-sheet';
import { AuthGuard } from '@/components/auth-guard';

export const metadata: Metadata = {
  title: 'Shopstream',
  description: 'Your one-stop shop for everything you need.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body antialiased min-h-screen flex flex-col bg-background">
        <Providers>
          <AuthGuard>
            <Header />
            <QuoteSheet />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </AuthGuard>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
