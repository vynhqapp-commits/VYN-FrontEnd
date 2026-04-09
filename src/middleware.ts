import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSupportedPublicLocale } from '@/lib/i18n-public';

const LANG_COOKIE = 'lang';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const q = request.nextUrl.searchParams.get('lang');
  if (isSupportedPublicLocale(q)) {
    response.cookies.set(LANG_COOKIE, q, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return response;
}

export const config = {
  // Skip all Next assets (chunks, HMR, fonts in dev, image optimizer, etc.)
  matcher: ['/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
