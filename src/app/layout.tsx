import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-name';
import { Toaster } from 'sonner';
import { LocaleProvider } from '@/components/LocaleProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: 'Discover top salons, book appointments in seconds, and treat yourself to the care you deserve.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable}`}>
      <body className={`${inter.className} antialiased min-h-screen`}>
        <Suspense>
          <LocaleProvider>
            <AuthProvider>
              {children}
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </LocaleProvider>
        </Suspense>
      </body>
    </html>
  );
}
