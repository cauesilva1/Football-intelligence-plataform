import type { Metadata } from "next";
import { Barlow_Condensed, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SportProviderWrapper } from "@/components/providers/sport-provider-wrapper";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700"],
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_TAGLINE} — scouting, performance intelligence and data-driven recruitment across soccer, basketball and American football.`,
};

/** Default sport on HTML only — cookie is read on the client so this layout stays cacheable. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-sport="SOCCER" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} bg-background font-body text-sm text-foreground antialiased`}
        suppressHydrationWarning
      >
        <SportProviderWrapper>{children}</SportProviderWrapper>
        <Analytics />
      </body>
    </html>
  );
}
