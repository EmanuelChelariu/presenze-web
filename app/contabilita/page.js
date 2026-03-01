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

export default function ContabilitaPage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/contabilita?month=${month}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const [y, m] = month.split("-").map(Number);
  const meseLabel = `${MESI[m - 1]} ${y}`;

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

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("FC COSTRUZIONI SRL", 14, 15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Registro Presenze — ${meseLabel}`, 14, 22);
    doc.setFontSize(8);
    doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")}`, 280, 15, { align: "right" });

    const head = [[
      "Nome e Cognome", "Giorni", "Straord. (h)",
      "Tariffa\ngiornaliera", "Tariffa\nstraord.",
      "Rimborsi", "Totale", "IBAN"
    ]];

    const body = rows.map((r) => [
      r.fullName,
      r.giorni,
      r.straordinari > 0 ? r.straordinari : "—",
      fmt(r.dailyRateAvg),
      r.straordinari > 0 ? fmt(r.overtimeRateAvg) : "—",
      r.rimborsi !== 0 ? fmt(r.rimborsi) : "—",
      fmt(r.totale),
      r.iban || "—",
    ]);

    // Riga totali
    body.push([
      { content: "TOTALE", styles: { fontStyle: "bold" } },
      { content: totGiorni, styles: { fontStyle: "bold" } },
      { content: totStraord > 0 ? totStraord : "—", styles: { fontStyle: "bold" } },
      { content: fmt(totDaily), styles: { fontStyle: "bold" } },
      { content: fmt(totOvertime), styles: { fontStyle: "bold" } },
      { content: totRimborsi !== 0 ? fmt(totRimborsi) : "—", styles: { fontStyle: "bold" } },
      { content: fmt(totTotale), styles: { fontStyle: "bold" } },
      "",
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 30,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
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
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { halign: "center", cellWidth: 14 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "right", cellWidth: 26 },
        4: { halign: "right", cellWidth: 26 },
        5: { halign: "right", cellWidth: 22 },
        6: { halign: "right", cellWidth: 28, fontStyle: "bold" },
        7: { cellWidth: 56 },
      },
      margin: { left: 6, right: 6 },
    });

    doc.save(`registro_presenze_${meseLabel.replace(" ", "_")}.pdf`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Contabilità per Mese</h1>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Mese</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Cerca
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1"
              >
                📄 PDF
              </button>
            )}
          </div>
        </div>

        {/* Tabella */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Caricamento...</p>
        ) : searched && rows.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nessuna presenza trovata per questo mese</p>
        ) : rows.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <span className="font-semibold text-gray-700">{meseLabel}</span>
              <span className="text-sm text-gray-400">{rows.length} dipendenti</span>
            </div>

            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-medium text-gray-600">
                  <th className="text-left px-4 py-3">Dipendente</th>
                  <th className="text-center px-3 py-3">Giorni</th>
                  <th className="text-center px-3 py-3">Straord.</th>
                  <th className="text-right px-3 py-3">Tar. giorn.</th>
                  <th className="text-right px-3 py-3">Tar. straord.</th>
                  <th className="text-right px-3 py-3">Rimborsi</th>
                  <th className="text-right px-4 py-3 text-gray-800">Totale</th>
                  <th className="text-left px-4 py-3">IBAN</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.employeeId} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.fullName}</td>
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
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.iban || "—"}</td>
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
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
