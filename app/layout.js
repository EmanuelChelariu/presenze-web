import { Geist } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import Navbar from "@/components/Navbar";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  title: "FC Costruzioni — Gestione Presenze",
  description: "Gestione presenze cantieri FC Costruzioni SRL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300`}>
        <ThemeProvider>
          <SessionWrapper>
            <Navbar />
            <main>{children}</main>
            <ThemeToggle />
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
