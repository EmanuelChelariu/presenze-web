import { Geist } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import Navbar from "@/components/Navbar";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  title: "FC Costruzioni — Gestione Presenze",
  description: "Gestione presenze cantieri FC Costruzioni SRL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={`${geist.variable} antialiased bg-slate-50 min-h-screen`}>
        <SessionWrapper>
          <Navbar />
          <main>{children}</main>
        </SessionWrapper>
      </body>
    </html>
  );
}
