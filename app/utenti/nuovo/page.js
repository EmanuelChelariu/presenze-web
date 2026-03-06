"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "admin", label: "Admin — Accesso completo a tutte le funzionalità" },
  { value: "ufficio", label: "Ufficio — Tutto tranne gestione utenti" },
  { value: "inserimento", label: "Inserimento — Presenze, rapportini, rimborsi" },
  { value: "operaio", label: "Operaio — Solo visualizzazione proprie presenze" },
];

const emptyForm = { name: "", email: "", password: "", role: "" };

export default function NuovoUtentePage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setError("Errore del server (risposta non valida). Riprova.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Errore durante il salvataggio");
        setLoading(false);
        return;
      }

      router.push("/utenti");
    } catch (err) {
      console.error("Errore salvataggio utente:", err);
      setError("Errore di rete. Controlla la connessione e riprova.");
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/utenti")} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
          ← Utenti
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Nuovo Utente</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="es. Mario Rossi" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} placeholder="nome@azienda.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} className={inputClass} placeholder="Minimo 6 caratteri" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo *</label>
            <select required value={form.role} onChange={(e) => set("role", e.target.value)} className={inputClass}>
              <option value="">Seleziona ruolo...</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p><strong>Admin</strong> — Accesso completo: presenze, contabilità, dipendenti, cantieri, rimborsi, utenti</p>
            <p><strong>Ufficio</strong> — Vede e gestisce tutto tranne la sezione Utenti</p>
            <p><strong>Inserimento</strong> — Inserisce presenze, rapportini, rimborsi; visualizza totali</p>
            <p><strong>Operaio</strong> — Visualizza solo le proprie presenze. Richiede email corrispondente a un dipendente</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.push("/utenti")} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? "Salvataggio..." : "Salva utente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
