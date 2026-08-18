import type { Metadata } from "next";
import { Architects_Daughter, Inter, Geist_Mono, Geist } from "next/font/google";
import "drawably/style.css";
import "./globals.css";
import { cn } from "@/lib/utils";

// drawably ships no font files; Inter is the type it is drawn against.
const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body
        className={`${geist.variable} ${architectsDaughter.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
