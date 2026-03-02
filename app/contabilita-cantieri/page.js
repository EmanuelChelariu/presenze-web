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

function fmt(n) {
  return Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function ContabilitaCantieriPage() {
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
        setSites(data);
        const operativi = data.filter((s) => s.operativo);
        if (operativi.length > 0) setSiteId(operativi[0]._id);
      });
  }, []);

  async function handleSearch() {
    if (!siteId || !month) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/contabilita-cantieri?siteId=${siteId}&month=${month}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const [y, m] = month.split("-").map(Number);
  const meseLabel = `${MESI[m - 1]} ${y}`;
  const siteLabel = sites.find((s) => s._id === siteId)?.name || "";

  // Totali colonne
  const totGiorni = rows.reduce((s, r) => s + r.giorni, 0);
  const totStraord = rows.reduce((s, r) => s + r.straordinari, 0);
  const totDaily = rows.reduce((s, r) => s + r.totaleDailyAmount, 0);
  const totOvertime = rows.reduce((s, r) => s + r.totaleOvertimeAmount, 0);
  const totRimborsi = rows.reduce((s, r) => s + r.rimborsi, 0);
  const totTotale = rows.reduce((s, r) => s + r.totale, 0);

  async function exportPDF() {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF("landscape");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("FC COSTRUZIONI SRL", 14, 15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Contabilità Cantiere: ${siteLabel} — ${meseLabel}`, 14, 22);
    doc.setFontSize(8);
    doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")}`, 280, 15, { align: "right" });

    const head = [[
      "Nome e Cognome", "Giorni", "Straord. (h)",
      "Tariffa\ngiornaliera", "Tariffa\nstraord.",
      "Rimborsi", "Totale"
    ]];

    const body = rows.map((r) => [
      r.fullName,
      r.giorni,
      r.straordinari > 0 ? r.straordinari : "—",
      fmt(r.dailyRateAvg),
      r.straordinari > 0 ? fmt(r.overtimeRateAvg) : "—",
      r.rimborsi !== 0 ? fmt(r.rimborsi) : "—",
      fmt(r.totale),
    ]);

    body.push([
      { content: "TOTALE", styles: { fontStyle: "bold" } },
      { content: totGiorni, styles: { fontStyle: "bold" } },
      { content: totStraord > 0 ? totStraord : "—", styles: { fontStyle: "bold" } },
      { content: fmt(totDaily), styles: { fontStyle: "bold" } },
      { content: fmt(totOvertime), styles: { fontStyle: "bold" } },
      { content: totRimborsi !== 0 ? fmt(totRimborsi) : "—", styles: { fontStyle: "bold" } },
      { content: fmt(totTotale), styles: { fontStyle: "bold" } },
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
        overflow: "linebreak",
        valign: "middle",
        textColor: 30,
        lineWidth: 0.15,
        lineColor: [220, 225, 230],
      },
      headStyles: {
        fillColor: [240, 244, 248],
        textColor: 20,
        fontStyle: "bold",
        halign: "center",
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "center", cellWidth: 24 },
        3: { halign: "right", cellWidth: 30 },
        4: { halign: "right", cellWidth: 30 },
        5: { halign: "right", cellWidth: 28 },
        6: { halign: "right", cellWidth: 34, fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`contabilita_${siteLabel.replace(/\s+/g, "_")}_${meseLabel.replace(" ", "_")}.pdf`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Contabilità Cantieri</h1>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Cantiere</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
            >
              <option value="">Seleziona cantiere...</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}{!s.operativo ? " (chiuso)" : ""}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Mese</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={!siteId || !month}
              className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
              Cerca
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                PDF
              </button>
            )}
          </div>
        </div>

        {/* Tabella */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Caricamento...</p>
        ) : searched && rows.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nessuna presenza trovata per questo cantiere e mese</p>
        ) : rows.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-700">{siteLabel}</span>
                <span className="text-gray-400 text-sm ml-2">— {meseLabel}</span>
              </div>
              <span className="text-sm text-gray-400">{rows.length} dipendenti</span>
            </div>

            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-medium text-gray-600">
                  <th className="text-left px-4 py-3">Dipendente</th>
                  <th className="text-center px-3 py-3">Giorni</th>
                  <th className="text-center px-3 py-3">Straord.</th>
                  <th className="text-right px-3 py-3">Tar. giorn.</th>
                  <th className="text-right px-3 py-3">Tar. straord.</th>
                  <th className="text-right px-3 py-3">Rimborsi</th>
                  <th className="text-right px-4 py-3 text-gray-800">Totale</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.employeeId} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.fullName}</td>
                    <td className="px-3 py-3 text-center font-semibold text-green-700">{r.giorni}</td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {r.straordinari > 0 ? `${r.straordinari}h` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600 text-sm">{fmt(r.dailyRateAvg)}</td>
                    <td className="px-3 py-3 text-right text-gray-600 text-sm">
                      {r.straordinari > 0 ? fmt(r.overtimeRateAvg) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-sm">
                      {r.rimborsi !== 0
                        ? <span className={r.rimborsi > 0 ? "text-green-600" : "text-red-500"}>{fmt(r.rimborsi)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(r.totale)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold text-sm">
                  <td className="px-4 py-3 text-gray-800">TOTALE</td>
                  <td className="px-3 py-3 text-center text-green-700">{totGiorni}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{totStraord > 0 ? `${totStraord}h` : "—"}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{fmt(totDaily)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{fmt(totOvertime)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{totRimborsi !== 0 ? fmt(totRimborsi) : "—"}</td>
                  <td className="px-4 py-3 text-right text-blue-700 text-base">{fmt(totTotale)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
