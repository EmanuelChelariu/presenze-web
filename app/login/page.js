"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Email o password non corretti");
    else router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Colonna sinistra — nera con logo */}
      <div className="hidden md:flex w-1/2 bg-black flex-col items-center justify-center p-12 gap-6">
        <Image src="/logo.png" alt="FC Costruzioni" width={200} height={200} />
        <p className="text-gray-500 text-sm text-center">
          Gestione presenze e contabilità cantieri
        </p>
      </div>

      {/* Colonna destra — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Logo su mobile */}
          <div className="flex justify-center mb-8 md:hidden">
            <div className="bg-black rounded-2xl p-5">
              <Image src="/logo.png" alt="FC Costruzioni" width={80} height={80} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Accedi</h1>
          <p className="text-gray-500 text-sm mb-8">FC Costruzioni SRL — Area riservata</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
                placeholder="nome@azienda.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
