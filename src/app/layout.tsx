import type { Metadata } from "next";
import { Architects_Daughter, Inter, Geist_Mono } from "next/font/google";
import "drawably/style.css";
import "./globals.css";

// drawably ships no font files; Inter is the type it is drawn against.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"]
});

// The display face for headings — an architect's hand, to match the sketch chrome.
const architectsDaughter = Architects_Daughter({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Roomly Planner",
  description: "Sketch and furnish real rooms from a shared room model."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${architectsDaughter.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
