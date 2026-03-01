"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TotaliPage() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        const operativi = data.filter((s) => s.operativo);
        setSites(operativi);
        if (operativi.length > 0) setSiteId(operativi[0]._id);
      });
  }, []);

  async function handleSearch() {
    if (!siteId || !month) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/totali?siteId=${siteId}&month=${month}`);
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }

  // Totali colonna
  const totPresenze = rows.reduce((s, r) => s + r.presenze, 0);
  const totStraord = rows.reduce((s, r) => s + r.straordinari, 0);

  // Label mese selezionato
  const [y, m] = month.split("-").map(Number);
  const meseLabel = `${MESI[m - 1]} ${y}`;

  // Cantiere selezionato
  const siteLabel = sites.find((s) => s._id === siteId)?.name || "";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Totale per Cantiere</h1>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Cantiere</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona cantiere...</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Mese</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={!siteId || !month}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Cerca
            </button>
          </div>
        </div>

        {/* Risultati */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Caricamento...</p>
        ) : searched && rows.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nessuna presenza trovata per questo cantiere e mese</p>
        ) : rows.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-700">{siteLabel}</span>
                <span className="text-gray-400 text-sm ml-2">— {meseLabel}</span>
              </div>
              <span className="text-sm text-gray-400">{rows.length} dipendenti</span>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Dipendente</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-green-700">Presenti</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-red-500">Assenti</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-yellow-600">Malattia</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-blue-600">Ferie</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-orange-500">Infort.</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Straord.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={String(r._id)} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.employeeName}</td>
                    <td className="px-4 py-3 text-center">
                      {r.presenze > 0 ? <span className="font-semibold text-green-700">{r.presenze}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.assenze > 0 ? <span className="text-red-500">{r.assenze}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.malattie > 0 ? <span className="text-yellow-600">{r.malattie}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.ferie > 0 ? <span className="text-blue-600">{r.ferie}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.infortuni > 0 ? <span className="text-orange-500">{r.infortuni}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {r.straordinari > 0 ? `${r.straordinari}h` : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totali */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Totale</td>
                  <td className="px-4 py-3 text-center text-green-700">{totPresenze}</td>
                  <td className="px-4 py-3 text-center text-red-500">{rows.reduce((s, r) => s + r.assenze, 0) || "—"}</td>
                  <td className="px-4 py-3 text-center text-yellow-600">{rows.reduce((s, r) => s + r.malattie, 0) || "—"}</td>
                  <td className="px-4 py-3 text-center text-blue-600">{rows.reduce((s, r) => s + r.ferie, 0) || "—"}</td>
                  <td className="px-4 py-3 text-center text-orange-500">{rows.reduce((s, r) => s + r.infortuni, 0) || "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{totStraord > 0 ? `${totStraord}h` : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
