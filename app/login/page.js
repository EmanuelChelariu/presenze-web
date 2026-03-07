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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Sfondo decorativo sottile */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }} />

      {/* Contenuto */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        {/* Logo */}
        <div className="mb-10">
          <Image src="/logo.png" alt="FC Costruzioni" width={120} height={120} className="opacity-90" />
        </div>

        {/* Sottotitolo */}
        <p className="text-gray-500 text-xs tracking-[0.2em] uppercase mb-8">Area riservata</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition text-sm"
              placeholder="Email"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition text-sm"
              placeholder="Password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3.5 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50 transition text-sm"
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-gray-700 text-[10px] mt-12 tracking-wider">
          FC COSTRUZIONI SRL
        </p>
      </div>
    </div>
  );
}
