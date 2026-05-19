import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Courier_Prime } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500", "600", "700"],
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-receipt',
});

export const metadata: Metadata = {
  title: {
    template: '%s | JB Store',
    default: 'JB Store',
  },
  description: 'Internal POS System',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayoutCaptured(props: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={courierPrime.variable}>
      <body
        className={`${jetbrainsMono.variable} font-mono min-h-screen bg-neutral-50 text-neutral-950 antialiased`}
      >
        <AppProviders>{props.children}</AppProviders>
      </body>
    </html>
  );
}
