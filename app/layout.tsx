import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, IBM_Plex_Sans_Arabic, Instrument_Serif, Inter_Tight } from "next/font/google";
import { LangSync } from "@/components/i18n/LangSync";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin", "latin-ext"], weight: ["300", "400", "500", "600"], display: "swap" });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: "italic", display: "swap" });
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "BRAVER", template: "%s · BRAVER" },
  description: "Trier ses inquiétudes en trois zones : scénario, action, acceptation.",
  applicationName: "BRAVER",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf6f0",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${interTight.variable} ${instrumentSerif.variable} ${atkinson.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LangSync />
        {children}
      </body>
    </html>
  );
}
