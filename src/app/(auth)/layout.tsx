import { Suspense } from 'react';
import { LocaleProvider } from '@/components/LocaleProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </Suspense>
  );
}
