import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";
import { Barlow_Condensed, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SportProviderWrapper } from "@/components/providers/sport-provider-wrapper";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { SPORT_HEADER } from "@/lib/sport-from-route";
import type { Sport } from "@/lib/sport";
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

function sportFromRequestHeader(value: string | null): Sport {
  if (
    value === "SOCCER" ||
    value === "BASKETBALL" ||
    value === "AMERICAN_FOOTBALL" ||
    value === "HOCKEY"
  ) {
    return value;
  }
  return "SOCCER";
}

function DocumentShell({
  initialSport,
  children,
}: {
  initialSport: Sport;
  children: ReactNode;
}) {
  return (
    <html lang="en" data-sport={initialSport} suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} bg-background font-body text-sm text-foreground antialiased`}
        suppressHydrationWarning
      >
        <SportProviderWrapper initialSport={initialSport}>{children}</SportProviderWrapper>
        <Analytics />
      </body>
    </html>
  );
}

/** Reads the route sport header. The rest of the document does not. */
async function RequestSportDocument({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const initialSport = sportFromRequestHeader(headerStore.get(SPORT_HEADER));
  return <DocumentShell initialSport={initialSport}>{children}</DocumentShell>;
}

/** Route sport is on the request header. Pages that do not name a sport stay Soccer until the client reads the cookie. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DocumentShell initialSport="SOCCER">{children}</DocumentShell>}>
      <RequestSportDocument>{children}</RequestSportDocument>
    </Suspense>
  );
}
