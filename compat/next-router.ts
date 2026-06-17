// Wrapper to provide consistent router interface between expo-router and next/navigation
import { useRouter as useNextRouter } from 'next/navigation';
import { usePathname, useSearchParams } from 'next/navigation';

export function useRouter() {
  const router = useNextRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return {
    push: (path: string) => router.push(path),
    replace: (path: string) => router.replace(path),
    back: () => router.back(),
    forward: () => router.forward(),
    prefetch: (path: string) => router.prefetch(path),
    pathname,
    query: Object.fromEntries(searchParams),
  };
}

export { usePathname, useSearchParams };
