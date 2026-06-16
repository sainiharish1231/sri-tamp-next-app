"use client";

import NextLink from "next/link";
import {
  useParams,
  usePathname,
  useRouter as useNextRouter
} from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

export type Href<T = string> = T;

export function normalizeHref(href: any): string {
  const original =
    typeof href === "string" ? href : href?.pathname || href?.href || "/";
  const hasTabsGroup = original.includes("(tabs)");
  let target = original.replace(/\/\([^/]+\)/g, "");
  target = target.replace(/\/index$/, "");
  if (!target || target === "/") return hasTabsGroup ? "/dashboard" : "/";
  return target;
}

export function useRouter() {
  const router = useNextRouter();
  return useMemo(
    () => ({
      push: (href: any) => router.push(normalizeHref(href)),
      replace: (href: any) => router.replace(normalizeHref(href)),
      back: () => router.back(),
      canGoBack: () => typeof window !== "undefined" && window.history.length > 1,
      navigate: (href: any) => router.push(normalizeHref(href)),
      dismiss: () => router.back()
    }),
    [router]
  );
}

export const router = {
  push(href: any) {
    if (typeof window !== "undefined") window.location.href = normalizeHref(href);
  },
  replace(href: any) {
    if (typeof window !== "undefined") window.location.replace(normalizeHref(href));
  },
  back() {
    if (typeof window !== "undefined") window.history.back();
  }
};

export function useLocalSearchParams<T extends Record<string, any> = Record<string, any>>() {
  const params = useParams();
  const pathname = usePathname();
  const [query, setQuery] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const nextQuery: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      nextQuery[key] = value;
    });
    setQuery(nextQuery);
  }, [pathname]);

  return useMemo(() => {
    return { ...params, ...query } as T;
  }, [params, query]);
}

export function useFocusEffect(effect: React.EffectCallback) {
  const pathname = usePathname();
  useEffect(effect, [effect, pathname]);
}

export function Redirect({ href }: { href: any }) {
  const navigation = useRouter();
  useEffect(() => {
    navigation.replace(href);
  }, [href, navigation]);
  return null;
}

export function Link({ href, children, ...props }: any) {
  return (
    <NextLink href={normalizeHref(href)} {...props}>
      {children}
    </NextLink>
  );
}

const Screen = () => null;

function StackComponent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
StackComponent.Screen = Screen;

function TabsComponent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
TabsComponent.Screen = Screen;

export const Stack = StackComponent as any;
export const Tabs = TabsComponent as any;
