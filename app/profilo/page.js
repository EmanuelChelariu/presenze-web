"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABELS = {
  admin: "Amministratore",
  ufficio: "Ufficio",
  "Supervisore Cantieri": "Supervisore Cantieri",
  "Capo Squadra": "Capo Squadra",
};

export default function ProfiloPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/profilo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setError("Errore del server. Riprova.");
        setLoading(false);
        return;
      }

      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Errore durante il salvataggio");
        return;
      }

      setSuccess("Password aggiornata con successo!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Errore cambio password:", err);
      setError("Errore di rete. Controlla la connessione e riprova.");
      setLoading(false);
    }
  }

  if (!session) return null;

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
          ← Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Il mio profilo</h1>

        {/* Info utente */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4 mb-6">
          <h2 className="font-semibold text-gray-700">Informazioni</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs text-gray-400 mb-0.5">Nome</span>
              <span className="font-medium text-gray-800">{session.user.name}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-400 mb-0.5">Email</span>
              <span className="text-gray-700 break-all">{session.user.email}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-400 mb-0.5">Ruolo</span>
              <span className="text-gray-700">{ROLE_LABELS[session.user.role] || session.user.role}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-400 mb-0.5">Azienda</span>
              <span className="text-gray-700">{session.user.companyName}</span>
            </div>
          </div>
        </div>

        {/* Cambio password */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Cambia password</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password attuale *</label>
            <input type="password" required value={form.currentPassword} onChange={(e) => set("currentPassword", e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password *</label>
            <input type="password" required minLength={6} value={form.newPassword} onChange={(e) => set("newPassword", e.target.value)} className={inputClass} placeholder="Minimo 6 caratteri" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conferma nuova password *</label>
            <input type="password" required minLength={6} value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} className={inputClass} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm font-medium">{success}</p>}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? "Salvataggio..." : "Aggiorna password"}
          </button>
        </form>
      </div>
    </div>
  );
}
