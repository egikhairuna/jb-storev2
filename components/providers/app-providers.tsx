"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useMemo, type ReactNode } from "react";

type AppProvidersEnvelope = Readonly<{
  children: ReactNode;
}>;

export function AppProviders(snapshot: AppProvidersEnvelope) {
  const queryHub = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 45_000,
            refetchOnWindowFocus: false,
            retry: 2,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
    [],
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryHub}>{snapshot.children}</QueryClientProvider>
    </SessionProvider>
  );
}
