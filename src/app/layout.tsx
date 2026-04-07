import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { cookies } from 'next/headers';
import { AuthProvider } from '@/lib/auth-context';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-name';
import { getDirForLocale, parsePublicLocale } from '@/lib/i18n-public';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body-latin',
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-body-arabic',
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: 'Discover top salons, book appointments in seconds, and treat yourself to the care you deserve.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parsePublicLocale(cookieStore.get('lang')?.value ?? null);
  const dir = getDirForLocale(locale);
  const isAr = locale === 'ar';

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${notoArabic.variable}`}>
      <body className={`${isAr ? notoArabic.className : inter.className} antialiased min-h-screen`}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
