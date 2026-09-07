import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import {Toaster} from "sonner";
import {AnalysisProvider} from "@/lib/analysis-store";
import CVProvider from "@/lib/cv-store";
import {SessionProvider} from "next-auth/react";
import Navbar from "@/components/Navbar";


const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
    display: "swap"
})

const jetBrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
    display: "swap"
})

const caveat = Caveat({
    subsets: ["latin"],
    variable: "--font-caveat",
    display: "swap"
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://jobradar-frontend-pearl.vercel.app"),
  title: {
    default: "Jobradar: your job market, mapped",
    template: "%s · Jobradar",
  },
  description:
      "Upload your CV and Jobradar scans live job postings, shows the skills your market really wants, the ones you have, and the gaps worth closing, all in about a minute.",
  openGraph: {
    type: "website",
    siteName: "Jobradar",
    title: "Jobradar: your job market, mapped",
    description:
        "Your CV vs the live job market: most-wanted skills, your coverage, the gaps worth closing, and real postings ranked by fit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jobradar: your job market, mapped",
    description:
        "Your CV vs the live job market: most-wanted skills, your coverage, the gaps worth closing, and real postings ranked by fit.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${jetBrainsMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-space text-foreground">
      <SessionProvider>
          <AnalysisProvider>
              <CVProvider>
                  <Navbar />
                  <main>
                      {children}
                  </main>
              </CVProvider>
          </AnalysisProvider>
          <Toaster theme="dark" />
      </SessionProvider>
      </body>

    </html>
  );
}
