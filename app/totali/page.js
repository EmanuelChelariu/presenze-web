"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const STATUS_COLORS = {
  Presente:   "bg-green-100 text-green-700",
  Assente:    "bg-red-100 text-red-600",
  Malattia:   "bg-yellow-100 text-yellow-700",
  Ferie:      "bg-blue-100 text-blue-700",
  Infortunio: "bg-orange-100 text-orange-700",
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDay(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function TotaliPage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Dettaglio dipendente selezionato
  const [selectedEmp, setSelectedEmp] = useState(null); // { _id, employeeName }
  const [detail, setDetail] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Carica automaticamente quando cambia il mese
  useEffect(() => {
    if (!month) return;
    setLoading(true);
    setSearched(true);
    setSelectedEmp(null);
    setDetail([]);
    fetch(`/api/totali?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [month]);

  // Carica dettaglio quando si seleziona un dipendente
  async function loadDetail(emp) {
    if (selectedEmp?._id === emp._id) {
      // Click di nuovo → chiudi dettaglio
      setSelectedEmp(null);
      setDetail([]);
      return;
    }
    setSelectedEmp(emp);
    setDetailLoading(true);
    const res = await fetch(`/api/totali/dettaglio?employeeId=${emp._id}&month=${month}`);
    const data = await res.json();
    setDetail(Array.isArray(data) ? data : []);
    setDetailLoading(false);
  }

  // Totali colonna
  const totPresenze = rows.reduce((s, r) => s + r.presenze, 0);
  const totAssenze = rows.reduce((s, r) => s + r.assenze, 0);
  const totMalattie = rows.reduce((s, r) => s + r.malattie, 0);
  const totFerie = rows.reduce((s, r) => s + r.ferie, 0);
  const totInfortuni = rows.reduce((s, r) => s + r.infortuni, 0);
  const totStraord = rows.reduce((s, r) => s + r.straordinari, 0);
  const totGiorni = rows.reduce((s, r) => s + r.totaleGiorni, 0);

  // Label mese selezionato
  const [y, m] = month.split("-").map(Number);
  const meseLabel = `${MESI[m - 1]} ${y}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Totale Presenze Mensili</h1>
        </div>

        {/* Filtro mese */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Mese</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
          />
        </div>

        {/* Tabella riassuntiva */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Caricamento...</p>
        ) : searched && rows.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nessuna presenza trovata per {meseLabel}</p>
        ) : rows.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow overflow-hidden mb-4">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-700">{meseLabel}</span>
                  <span className="text-gray-400 text-sm ml-2">— Tutti i cantieri</span>
                </div>
                <span className="text-sm text-gray-400">{rows.length} dipendenti</span>
              </div>

              <p className="px-4 py-2 text-xs text-gray-400 italic">
                Seleziona un dipendente per vedere il dettaglio giornaliero
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Dipendente</th>
                      <th className="text-center px-3 py-3 text-sm font-medium text-gray-500">Tot.</th>
                      <th className="text-center px-3 py-3 text-sm font-medium text-green-700">Presenti</th>
                      <th className="text-center px-3 py-3 text-sm font-medium text-red-500">Assenti</th>
                      <th className="text-center px-3 py-3 text-sm font-medium text-yellow-600">Malattia</th>
                      <th className="text-center px-3 py-3 text-sm font-medium text-blue-600">Ferie</th>
                      <th className="text-center px-3 py-3 text-sm font-medium text-orange-500">Infort.</th>
                      <th className="text-center px-3 py-3 text-sm font-medium text-gray-600">Straord.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={String(r._id)}
                        onClick={() => loadDetail(r)}
                        className={`border-b last:border-0 cursor-pointer transition
                          ${selectedEmp?._id === r._id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}
                          ${i % 2 === 0 ? "" : "bg-gray-50/50"}
                          hover:bg-blue-50/50
                        `}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">{r.employeeName}</td>
                        <td className="px-3 py-3 text-center font-semibold text-gray-700">{r.totaleGiorni}</td>
                        <td className="px-3 py-3 text-center">
                          {r.presenze > 0 ? <span className="font-semibold text-green-700">{r.presenze}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.assenze > 0 ? <span className="text-red-500">{r.assenze}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.malattie > 0 ? <span className="text-yellow-600">{r.malattie}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.ferie > 0 ? <span className="text-blue-600">{r.ferie}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.infortuni > 0 ? <span className="text-orange-500">{r.infortuni}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {r.straordinari > 0 ? `${r.straordinari}h` : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totali */}
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-gray-700">Totale</td>
                      <td className="px-3 py-3 text-center text-gray-700">{totGiorni}</td>
                      <td className="px-3 py-3 text-center text-green-700">{totPresenze || "—"}</td>
                      <td className="px-3 py-3 text-center text-red-500">{totAssenze || "—"}</td>
                      <td className="px-3 py-3 text-center text-yellow-600">{totMalattie || "—"}</td>
                      <td className="px-3 py-3 text-center text-blue-600">{totFerie || "—"}</td>
                      <td className="px-3 py-3 text-center text-orange-500">{totInfortuni || "—"}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{totStraord > 0 ? `${totStraord}h` : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Dettaglio dipendente */}
            {selectedEmp && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-4 py-3 border-b bg-blue-50 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-blue-800">{selectedEmp.employeeName}</span>
                    <span className="text-blue-500 text-sm ml-2">— Dettaglio {meseLabel}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedEmp(null); setDetail([]); }}
                    className="text-sm text-blue-400 hover:text-blue-600"
                  >
                    ✕ Chiudi
                  </button>
                </div>

                {detailLoading ? (
                  <p className="text-center text-gray-400 py-8">Caricamento dettaglio...</p>
                ) : detail.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Nessuna presenza trovata</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50 text-xs font-medium text-gray-600">
                          <th className="text-left px-4 py-2">Giorno</th>
                          <th className="text-left px-4 py-2">Stato</th>
                          <th className="text-center px-4 py-2">Straordinari</th>
                          <th className="text-left px-4 py-2">Cantiere</th>
                          <th className="text-left px-4 py-2">Autore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.map((d, i) => (
                          <tr key={String(d._id)} className={`border-b last:border-0 ${i % 2 !== 0 ? "bg-gray-50/50" : ""}`}>
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-800 capitalize">
                              {fmtDay(d.date)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] || "bg-gray-100 text-gray-600"}`}>
                                {d.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-sm text-gray-600">
                              {d.overtimeHours > 0 ? `${d.overtimeHours}h` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-600">{d.siteName}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{d.createdByName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
