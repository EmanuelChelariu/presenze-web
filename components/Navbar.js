"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (!session) return null;

  const role = session.user?.role;
  const isAdmin = role === "admin";
  const isUfficio = role === "ufficio";

  const links = [
    { href: "/dashboard", label: "Dashboard", always: true },
    { href: "/presenze", label: "Presenze", show: isAdmin || role === "Supervisore Cantieri" || role === "Capo Squadra" },
    { href: "/totali", label: "Tot. Presenze", always: true },
    { href: "/contabilita-cantieri", label: "Cont. Cantieri", show: isAdmin || isUfficio },
    { href: "/contabilita", label: "Cont. Mensile", show: isAdmin || isUfficio },
    { href: "/rapportini", label: "Rapportini", show: isAdmin || role === "Supervisore Cantieri" || role === "Capo Squadra" },
    { href: "/rimborsi", label: "Rimborsi", show: isAdmin },
    { href: "/dipendenti", label: "Dipendenti", show: isAdmin },
    { href: "/cantieri", label: "Cantieri", show: isAdmin },
    { href: "/utenti", label: "Utenti", show: isAdmin },
  ].filter((l) => l.always || l.show);

  return (
    <nav className="bg-gray-950 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => router.push("/dashboard")}>
          <Image
            src="/logo.png"
            alt="FC Costruzioni"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="font-bold text-sm tracking-wider hidden lg:block">FC COSTRUZIONI</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-0.5 overflow-x-auto mx-4 scrollbar-hide">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                pathname === l.href
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/profilo"
            className={`text-xs hidden md:block transition ${
              pathname === "/profilo" ? "text-teal-400 font-medium" : "text-gray-500 hover:text-white"
            }`}
          >
            {session.user?.name}
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-500 hover:text-white transition px-2 py-1 rounded hover:bg-white/10"
          >
            Esci
          </button>
        </div>
      </div>
    </nav>
  );
}
