"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const emptyForm = {
  firstName: "", lastName: "", badgeId: "", phone: "",
  email: "", iban: "", role: "", companyId: "",
  dailyRate: "", overtimeRate: "", dailyContribution: "",
  active: true,
};

export default function NuovoDipendentePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCompanies(data); })
      .catch(() => {});
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function generateBadge() {
    const code = "FC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    set("badgeId", code);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Errore durante il salvataggio");
      } else {
        router.push("/dipendenti");
      }
    } catch (err) {
      console.error("Errore salvataggio dipendente:", err);
      setError("Errore di rete. Controlla la connessione e riprova.");
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push("/dipendenti")} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
          ← Dipendenti
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Nuovo Dipendente</h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Dati anagrafici */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-gray-700">Dati anagrafici</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                <input type="text" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge ID *</label>
              <div className="flex gap-2">
                <input type="text" required value={form.badgeId} onChange={(e) => set("badgeId", e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="FC-XXXXXX" />
                <button type="button" onClick={generateBadge} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition whitespace-nowrap">
                  Genera
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo lavorativo</label>
                <input type="text" value={form.role} onChange={(e) => set("role", e.target.value)} className={inputClass} placeholder="es. Muratore, Elettricista..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
                <select required value={form.companyId} onChange={(e) => set("companyId", e.target.value)} className={inputClass}>
                  <option value="">Seleziona...</option>
                  {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input type="text" value={form.iban} onChange={(e) => set("iban", e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="IT00 X000 0000 0000 0000 0000 000" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="w-4 h-4" />
              <label htmlFor="active" className="text-sm text-gray-700">Dipendente attivo</label>
            </div>
          </div>

          {/* Tariffe */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-gray-700">Tariffe</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tariffa giornaliera (€)</label>
                <input type="number" step="0.01" min="0" value={form.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tariffa straordinari (€/h)</label>
                <input type="number" step="0.01" min="0" value={form.overtimeRate} onChange={(e) => set("overtimeRate", e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contributo giornaliero (€)</label>
                <input type="number" step="0.01" value={form.dailyContribution} onChange={(e) => set("dailyContribution", e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
            </div>
            <p className="text-xs text-gray-400">Le tariffe vengono salvate con ogni presenza per mantenere lo storico corretto.</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/dipendenti")} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? "Salvataggio..." : "Salva dipendente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
