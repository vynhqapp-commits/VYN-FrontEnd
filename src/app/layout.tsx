import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { cookies } from 'next/headers';
import { AuthProvider } from '@/lib/auth-context';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-name';
import { getDirForLocale, parsePublicLocale } from '@/lib/i18n-public';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body-latin',
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-body-arabic',
  // Most visits are Latin-only; do not preload Arabic on the critical path
  preload: false,
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: 'Discover top salons, book appointments in seconds, and treat yourself to the care you deserve.',
};

const themeBootScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)salon_theme=([^;]+)/);var t=m?decodeURIComponent(m[1].trim()):null;if(t!=='light'&&t!=='dark'){try{t=localStorage.getItem('salon_theme');}catch(e){t=null}}if(t!=='light'&&t!=='dark')t='dark';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parsePublicLocale(cookieStore.get('lang')?.value ?? null);
  const dir = getDirForLocale(locale);
  const isAr = locale === 'ar';
  const themeCookie = cookieStore.get('salon_theme')?.value;
  const htmlDark = themeCookie !== 'light';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${notoArabic.variable}${htmlDark ? ' dark' : ''}`}
      suppressHydrationWarning
    >
      <body className={`${isAr ? notoArabic.className : inter.className} antialiased min-h-screen`}>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
