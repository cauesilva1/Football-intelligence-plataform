import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SportProviderWrapper } from "@/components/providers/sport-provider-wrapper";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import "./globals.css";

const interDisplay = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const interBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
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
    <html lang="pt" className="dark" data-sport="SOCCER" suppressHydrationWarning>
      <body
        className={`${interDisplay.variable} ${interBody.variable} ${jetbrainsMono.variable} bg-background font-body text-sm text-foreground antialiased`}
        suppressHydrationWarning
      >
        <SportProviderWrapper>{children}</SportProviderWrapper>
      </body>
    </html>
  );
}
