"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const emptyForm = {
  name: "", committente: "", address: "",
  startDate: "", operativo: true, companyId: "",
};

export default function NuovoCantiereePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then(setCompanies);
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) setError(data.error || "Errore durante il salvataggio");
    else router.push("/cantieri");
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/cantieri")} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
          ← Cantieri
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Nuovo Cantiere</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome cantiere *</label>
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="es. Via Roma 10 - Milano" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Committente</label>
            <input type="text" value={form.committente} onChange={(e) => set("committente", e.target.value)} className={inputClass} placeholder="Nome cliente/committente" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
            <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass} placeholder="Via, numero, città" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
              <select required value={form.companyId} onChange={(e) => set("companyId", e.target.value)} className={inputClass}>
                <option value="">Seleziona...</option>
                {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="operativo" checked={form.operativo} onChange={(e) => set("operativo", e.target.checked)} className="w-4 h-4" />
            <label htmlFor="operativo" className="text-sm text-gray-700">Cantiere operativo</label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.push("/cantieri")} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? "Salvataggio..." : "Salva cantiere"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
