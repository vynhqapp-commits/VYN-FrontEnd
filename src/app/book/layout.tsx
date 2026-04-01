import { Suspense } from 'react';
import { LocaleProvider } from '@/components/LocaleProvider';

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </Suspense>
  );
}
