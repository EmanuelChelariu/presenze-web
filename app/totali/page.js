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

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
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

  // PDF panorama
  const [exporting, setExporting] = useState(false);

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

  // Label mese selezionato
  const [y, m] = month.split("-").map(Number);
  const meseLabel = `${MESI[m - 1]} ${y}`;

  // Giorni della settimana abbreviati (italiano)
  const GIORNI_SETT = ["D", "L", "M", "M", "G", "V", "S"];

  // ── PDF Panorama Mensile ──
  async function exportPanorama() {
    setExporting(true);
    try {
      // Fetch tutte le presenze del mese
      const res = await fetch(`/api/totali/panorama?month=${month}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        alert("Nessuna presenza trovata per questo mese.");
        setExporting(false);
        return;
      }

      // Numero giorni del mese
      const daysInMonth = new Date(y, m, 0).getDate();

      // Raggruppa per dipendente: { employeeName -> { day -> { status, overtimeHours } } }
      const empMap = {};
      for (const p of data) {
        const name = p.employeeName || "—";
        if (!empMap[name]) empMap[name] = { days: {}, totalOT: 0 };
        const day = new Date(p.date).getUTCDate();
        empMap[name].days[day] = p.status;
        empMap[name].totalOT += p.overtimeHours || 0;
      }

      // Ordina dipendenti alfabeticamente
      const empNames = Object.keys(empMap).sort((a, b) => a.localeCompare(b));

      // Abbreviazioni stato
      const STATUS_LETTER = { Presente: "P", Assente: "A", Malattia: "M", Ferie: "F", Infortunio: "I" };
      // Colori sfondo RGB per le celle
      const STATUS_BG = {
        P: [200, 235, 200],  // verde chiaro
        A: [255, 200, 200],  // rosso chiaro
        M: [255, 240, 190],  // giallo chiaro
        F: [200, 220, 255],  // blu chiaro
        I: [255, 220, 190],  // arancione chiaro
      };

      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF("landscape");
      const pageW = doc.internal.pageSize.width;

      // Header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Registro Presenze (Panorama) — FC COSTRUZIONI SRL", 14, 14);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Mese: ${meseLabel}`, 14, 20);

      // Generato il (top right)
      const now = new Date().toLocaleString("it-IT");
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`Generato il: ${now}`, pageW - 14, 14, { align: "right" });

      // Legenda
      doc.setFontSize(7);
      doc.setTextColor(0);
      const legendY = 25;
      doc.text("Legenda:", 14, legendY);
      const legendItems = [
        { letter: "P", label: "Presente", bg: STATUS_BG.P },
        { letter: "A", label: "Assente", bg: STATUS_BG.A },
        { letter: "M", label: "Malattia", bg: STATUS_BG.M },
        { letter: "F", label: "Ferie", bg: STATUS_BG.F },
        { letter: "I", label: "Infortunio", bg: STATUS_BG.I },
      ];
      let lx = 32;
      legendItems.forEach((item) => {
        doc.setFillColor(...item.bg);
        doc.rect(lx, legendY - 3, 4, 4, "F");
        doc.text(`${item.letter} = ${item.label}`, lx + 6, legendY);
        lx += 30;
      });

      // Costruisci header tabella: Nome | G1 | G2 | ... | G31 | Giorni | Str.
      // Due righe di header: riga 1 = giorno settimana, riga 2 = numero giorno
      const dayHeaders = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(y, m - 1, d).getDay(); // 0=dom
        dayHeaders.push(`${GIORNI_SETT[dow]}\n${d}`);
      }
      const head = [["Nome e Cognome", ...dayHeaders, "Giorni", "Str."]];

      // Costruisci righe
      const bodyRows = empNames.map((name) => {
        const emp = empMap[name];
        const cells = [name];
        let giorniPresente = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const status = emp.days[d];
          if (status) {
            const letter = STATUS_LETTER[status] || "?";
            cells.push(letter);
            if (status === "Presente") giorniPresente++;
          } else {
            cells.push("");
          }
        }
        cells.push(String(giorniPresente));
        cells.push(String(emp.totalOT));
        return cells;
      });

      // Calcola larghezze colonne
      const nameColW = 42;
      const totColW = 11;
      const availW = pageW - 28 - nameColW - totColW * 2; // margini 14+14
      const dayColW = Math.floor((availW / daysInMonth) * 10) / 10;

      const columnStyles = { 0: { cellWidth: nameColW, halign: "left", fontSize: 6 } };
      for (let d = 1; d <= daysInMonth; d++) {
        columnStyles[d] = { cellWidth: dayColW, halign: "center", fontSize: 6 };
      }
      columnStyles[daysInMonth + 1] = { cellWidth: totColW, halign: "center", fontStyle: "bold", fontSize: 6 };
      columnStyles[daysInMonth + 2] = { cellWidth: totColW, halign: "center", fontSize: 6 };

      autoTable(doc, {
        startY: 30,
        head,
        body: bodyRows,
        theme: "grid",
        styles: {
          fontSize: 5.5,
          cellPadding: 1.2,
          lineWidth: 0.1,
          lineColor: [180, 180, 180],
          overflow: "hidden",
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [40, 40, 40],
          fontStyle: "bold",
          fontSize: 5.5,
          halign: "center",
          valign: "middle",
          cellPadding: 1,
        },
        columnStyles,
        alternateRowStyles: { fillColor: [250, 250, 250] },
        // Colore celle in base allo stato
        didParseCell: function (data) {
          if (data.section === "body" && data.column.index >= 1 && data.column.index <= daysInMonth) {
            const val = data.cell.raw;
            if (val && STATUS_BG[val]) {
              data.cell.styles.fillColor = STATUS_BG[val];
            }
          }
        },
      });

      // Salva
      doc.save(`panorama_presenze_${MESI[m - 1]}_${y}.pdf`);
    } catch (err) {
      console.error("Errore export panorama:", err);
      alert("Errore durante la generazione del PDF.");
    }
    setExporting(false);
  }

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
              className="flex-1 sm:w-64 sm:flex-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
            />
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-gray-600 font-medium"
            >
              →
            </button>
          </div>
        </div>

        {/* Pulsante Stampa Panorama */}
        {rows.length > 0 && (
          <div className="mb-4">
            <button
              onClick={exportPanorama}
              disabled={exporting}
              className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {exporting ? "Generazione PDF..." : "📄 Stampa PDF Panorama Mensile"}
            </button>
          </div>
        )}

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
