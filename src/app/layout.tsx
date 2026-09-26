import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";

const display = Cinzel({ variable: "--font-cinzel", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daggerheart · Mesa",
  description: "Hojas de personaje de Daggerheart para tu grupo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-mh-theme="dark" suppressHydrationWarning className={`${display.variable} ${body.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
