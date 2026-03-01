"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CantieriPage() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("attivi"); // "attivi" | "tutti"

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

  async function toggleOperativo(site) {
    await fetch(`/api/sites/${site._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...site, operativo: !site.operativo }),
    });
    setSites((prev) => prev.map((s) => s._id === site._id ? { ...s, operativo: !s.operativo } : s));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
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
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="attivi">Solo operativi</option>
            <option value="tutti">Tutti</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nessun cantiere trovato</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[24%]">Cantiere</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[17%]">Committente</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[20%]">Indirizzo</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[10%]">Inizio</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[11%]">Stato</th>
                  <th className="text-right px-4 py-3 w-[18%]"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((site, i) => (
                  <tr key={site._id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 truncate">{site.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm truncate">{site.committente || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm truncate">{site.address || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {site.startDate ? new Date(site.startDate).toLocaleDateString("it-IT") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${site.operativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {site.operativo ? "Operativo" : "Chiuso"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/cantieri/${site._id}`)}
                        className="text-sm text-blue-600 hover:underline mr-3"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => toggleOperativo(site)}
                        className="text-sm text-gray-500 hover:underline"
                      >
                        {site.operativo ? "Chiudi" : "Riapri"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-sm text-gray-400 mt-4">{filtered.length} cantieri</p>
      </div>
    </div>
  );
}
