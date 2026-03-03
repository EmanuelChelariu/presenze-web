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

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
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
  const [totaleMese, setTotaleMese] = useState(0);
  const [totaleInizio, setTotaleInizio] = useState(0);
  const [cantieriMese, setCantieriMese] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Carica tutti i cantieri
  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        setSites(data);
      });
  }, []);

  // Carica automaticamente quando cambiano siteId o month
  useEffect(() => {
    if (!siteId || !month) return;
    setLoading(true);
    setSearched(true);
    fetch(`/api/contabilita-cantieri?siteId=${siteId}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setTotaleMese(data.totaleMese || 0);
        setTotaleInizio(data.totaleInizio || 0);
        setCantieriMese(Array.isArray(data.cantieriMese) ? data.cantieriMese : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, month]);

  const [y, m] = month.split("-").map(Number);
  const meseLabel = `${MESI[m - 1]} ${y}`;
  const siteLabel = sites.find((s) => s._id === siteId)?.name || "";

  // Totali colonne
  const totGiorni = rows.reduce((s, r) => s + r.giorni, 0);
  const totStraord = rows.reduce((s, r) => s + r.straordinari, 0);
  const totDailyAmount = rows.reduce((s, r) => s + r.totaleDailyAmount, 0);
  const totOvertimeAmount = rows.reduce((s, r) => s + r.totaleOvertimeAmount, 0);
  const totContributo = rows.reduce((s, r) => s + r.totaleContributo, 0);
  const totTotale = rows.reduce((s, r) => s + r.totaleDailyAmount + r.totaleOvertimeAmount, 0);

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
      "Nome e Cognome",
      "Giorni\nlavorati",
      "Ore\nStraord.",
      "Tariffa\ngiornaliera €",
      "Totale\ngiornaliero €",
      "Tariffa\nstraord. €",
      "Totale\nstraord. €",
      "Contributo\ngiornaliero €",
      "Totale\ncontributi €",
      "TOTALE",
    ]];

    const body = rows.map((r) => {
      const rowTotale = r.totaleDailyAmount + r.totaleOvertimeAmount + r.totaleContributo;
      return [
        r.fullName,
        r.giorni,
        r.straordinari > 0 ? r.straordinari : "—",
        fmt(r.dailyRate),
        fmt(r.totaleDailyAmount),
        r.straordinari > 0 ? fmt(r.overtimeRate) : "—",
        r.straordinari > 0 ? fmt(r.totaleOvertimeAmount) : "—",
        fmt(r.dailyContribution),
        fmt(r.totaleContributo),
        fmt(rowTotale),
      ];
    });

    const grandTotal = rows.reduce((s, r) => s + r.totaleDailyAmount + r.totaleOvertimeAmount + r.totaleContributo, 0);

    // Riga TOTALE
    body.push([
      { content: "TOTALE", styles: { fontStyle: "bold" } },
      { content: String(totGiorni), styles: { fontStyle: "bold" } },
      { content: totStraord > 0 ? String(totStraord) : "—", styles: { fontStyle: "bold" } },
      { content: "", styles: { fontStyle: "bold" } },
      { content: fmt(totDailyAmount), styles: { fontStyle: "bold" } },
      { content: "", styles: { fontStyle: "bold" } },
      { content: fmt(totOvertimeAmount), styles: { fontStyle: "bold" } },
      { content: "", styles: { fontStyle: "bold" } },
      { content: fmt(totContributo), styles: { fontStyle: "bold" } },
      { content: fmt(grandTotal), styles: { fontStyle: "bold", textColor: [0, 0, 180] } },
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 30,
      styles: {
        fontSize: 7,
        cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
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
        fontSize: 6.5,
      },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: "center", cellWidth: 18 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "right", cellWidth: 26 },
        4: { halign: "right", cellWidth: 26 },
        5: { halign: "right", cellWidth: 26 },
        6: { halign: "right", cellWidth: 26 },
        7: { halign: "right", cellWidth: 26 },
        8: { halign: "right", cellWidth: 26 },
        9: { halign: "right", cellWidth: 28, fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`contabilita_${siteLabel.replace(/\s+/g, "_")}_${meseLabel.replace(" ", "_")}.pdf`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Contabilità Cantieri</h1>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col sm:flex-row gap-3 items-end">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonth(shiftMonth(month, -1))}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-gray-600 font-medium"
              >
                ←
              </button>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
              />
              <button
                onClick={() => setMonth(shiftMonth(month, 1))}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-gray-600 font-medium"
              >
                →
              </button>
            </div>
          </div>
          {rows.length > 0 && (
            <button
              onClick={exportPDF}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700 transition whitespace-nowrap"
            >
              Esporta PDF
            </button>
          )}
        </div>

        {/* Info totali cantiere */}
        {searched && rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 mb-1">Totale del mese — {meseLabel}</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(totaleMese)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 mb-1">Totale dall&apos;inizio cantiere</p>
              <p className="text-2xl font-bold text-green-700">{fmt(totaleInizio)}</p>
            </div>
          </div>
        )}

        {/* Cantieri attivi nel mese */}
        {searched && cantieriMese.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Cantieri con presenze in {meseLabel}:</p>
            <div className="flex flex-wrap gap-2">
              {cantieriMese.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSiteId(c._id)}
                  className={`px-3 py-1 rounded-full text-sm transition ${c._id === siteId ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabella */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Caricamento...</p>
        ) : !siteId ? (
          <p className="text-center text-gray-400 py-12">Seleziona un cantiere per visualizzare la contabilità</p>
        ) : searched && rows.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nessuna presenza trovata per {siteLabel} in {meseLabel}</p>
        ) : rows.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-700">{siteLabel}</span>
                <span className="text-gray-400 text-sm ml-2">— {meseLabel}</span>
              </div>
              <span className="text-sm text-gray-400">{rows.length} dipendenti</span>
            </div>

            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-medium text-gray-600">
                  <th className="text-left px-4 py-3">Nome e Cognome</th>
                  <th className="text-center px-2 py-3">Giorni</th>
                  <th className="text-right px-2 py-3">Tar. Giorn.</th>
                  <th className="text-right px-2 py-3">Tot. Giorn.</th>
                  <th className="text-center px-2 py-3">Ore Str.</th>
                  <th className="text-right px-2 py-3">Tot. Str.</th>
                  <th className="text-right px-2 py-3">Contr. Giorn.</th>
                  <th className="text-right px-4 py-3">Tot. Contr.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.employeeId} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.fullName}</td>
                    <td className="px-2 py-3 text-center font-semibold text-green-700">{r.giorni}</td>
                    <td className="px-2 py-3 text-right text-sm text-gray-600">{fmt(r.dailyRate)}</td>
                    <td className="px-2 py-3 text-right text-sm font-medium text-gray-800">{fmt(r.totaleDailyAmount)}</td>
                    <td className="px-2 py-3 text-center text-gray-600">
                      {r.straordinari > 0 ? `${r.straordinari}h` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-3 text-right text-sm text-gray-600">
                      {r.totaleOvertimeAmount > 0 ? fmt(r.totaleOvertimeAmount) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-3 text-right text-sm text-gray-600">{fmt(r.dailyContribution)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">{fmt(r.totaleContributo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold text-sm">
                  <td className="px-4 py-3 text-gray-800">TOTALE</td>
                  <td className="px-2 py-3 text-center text-green-700">{totGiorni}</td>
                  <td className="px-2 py-3"></td>
                  <td className="px-2 py-3 text-right text-gray-800">{fmt(totDailyAmount)}</td>
                  <td className="px-2 py-3 text-center text-gray-700">{totStraord > 0 ? `${totStraord}h` : ""}</td>
                  <td className="px-2 py-3 text-right text-gray-700">{fmt(totOvertimeAmount)}</td>
                  <td className="px-2 py-3"></td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmt(totContributo)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
