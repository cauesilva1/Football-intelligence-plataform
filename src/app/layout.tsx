import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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
  title: "Football Intelligence Platform",
  description: "Plataforma profissional de análise de jogadores, scouting e performance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${interDisplay.variable} ${interBody.variable} ${jetbrainsMono.variable} bg-background font-body text-sm text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
