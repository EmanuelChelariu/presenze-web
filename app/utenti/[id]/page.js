"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "ufficio", label: "Ufficio" },
  { value: "inserimento", label: "Inserimento Presenze" },
  { value: "operaio", label: "Operaio" },
];

export default function ModificaUtentePage() {
  const router = useRouter();
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          name: data.name || "",
          email: data.email || "",
          role: data.role || "",
          active: data.active !== false,
          password: "",
        });
      })
      .catch(() => setError("Errore caricamento dati utente"));
  }, [id]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = { name: form.name, email: form.email, role: form.role, active: form.active };
      if (form.password) payload.password = form.password;

      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  if (!form && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Caricamento...</p>
      </div>
    );
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/utenti")} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
          ← Utenti
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Modifica Utente</h1>

        {error && !form && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {form && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dati utente */}
            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <h2 className="font-semibold text-gray-700">Dati utente</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo *</label>
                <select required value={form.role} onChange={(e) => set("role", e.target.value)} className={inputClass}>
                  <option value="">Seleziona...</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="w-4 h-4" />
                <label htmlFor="active" className="text-sm text-gray-700">Utente attivo</label>
              </div>
            </div>

            {/* Reset Password */}
            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <h2 className="font-semibold text-gray-700">Reset Password</h2>
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                Lascia vuoto per mantenere la password attuale. Inserisci una nuova password solo se vuoi resettarla.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password</label>
                <input
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={inputClass}
                  placeholder="Minimo 6 caratteri"
                />
              </div>
            </div>

            {error && form && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => router.push("/utenti")} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">
                Annulla
              </button>
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
