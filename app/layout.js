import { Geist } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  title: "FC Costruzioni — Gestione Presenze",
  description: "Gestione presenze cantieri",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={`${geist.variable} antialiased`}>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
