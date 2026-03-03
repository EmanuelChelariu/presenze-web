"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CantieriPage() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("attivi");

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => { setSites(data); setLoading(false); });
  }, []);

  const filtered = sites
    .filter((s) => filtro === "attivi" ? s.operativo : true)
    .filter((s) =>
      `${s.name} ${s.committente} ${s.address}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  // Cantieri che non contano nel conteggio operativi (restano visibili)
  const ESCLUSI_CONTEGGIO = ["Corsi Formazione", "Magazzino | Sede"];
  const conteggioFiltered = filtered.filter((s) => !ESCLUSI_CONTEGGIO.includes(s.name?.trim()));
  const operativi = conteggioFiltered.filter((s) => s.operativo).length;
  const chiusi = conteggioFiltered.filter((s) => !s.operativo).length;

  async function toggleOperativo(site) {
    await fetch(`/api/sites/${site._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...site, operativo: !site.operativo }),
    });
    setSites((prev) => prev.map((s) => s._id === site._id ? { ...s, operativo: !s.operativo } : s));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Cantieri</h1>
          </div>
          <button
            onClick={() => router.push("/cantieri/nuovo")}
            className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            + Aggiungi
          </button>
        </div>

        {/* Filtri */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Cerca per nome, committente, indirizzo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
          />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
          >
            <option value="attivi">Solo operativi</option>
            <option value="tutti">Tutti</option>
          </select>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          {conteggioFiltered.length} cantieri — <span className="text-gray-600 font-medium">{operativi} operativi</span> · <span className="text-gray-600 font-medium">{chiusi} chiusi</span>
        </p>

        {/* Lista */}
        {loading ? (
          <p className="text-center text-gray-500 py-12">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nessun cantiere trovato</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((site) => (
              <div key={site._id} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Riga principale: nome + stato + azioni */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 text-base">{site.name}</span>
                    {site.operativo ? (
                      <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-medium">Operativo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium">Chiuso</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/cantieri/${site._id}`)}
                      className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition font-medium"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => toggleOperativo(site)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${site.operativo ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
                    >
                      {site.operativo ? "Chiudi" : "Riapri"}
                    </button>
                  </div>
                </div>

                {/* Dettagli in griglia */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 px-5 py-4 text-sm">
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Committente</span>
                    <span className="text-gray-700">{site.committente || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Indirizzo</span>
                    <span className="text-gray-700">{site.address || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Data inizio</span>
                    <span className="text-gray-700">{fmtDate(site.startDate)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Data inserimento</span>
                    <span className="text-gray-600">{fmtDate(site.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
