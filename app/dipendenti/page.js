"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmt(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function DipendentiPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => { setEmployees(data); setLoading(false); });
  }, []);

  const filtered = employees.filter((e) =>
    `${e.firstName} ${e.lastName} ${e.fullName} ${e.badgeId} ${e.role} ${e.companyId?.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function handleDelete(id) {
    if (!confirm("Vuoi disattivare questo dipendente?")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((e) => e._id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Anagrafica Dipendenti</h1>
          </div>
          <button
            onClick={() => router.push("/dipendenti/nuovo")}
            className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            + Aggiungi
          </button>
        </div>

        {/* Ricerca */}
        <input
          type="text"
          placeholder="Cerca per nome, badge, ruolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
        />

        {/* Lista */}
        {loading ? (
          <p className="text-center text-gray-500 py-12">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nessun dipendente trovato</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 border-b">
                <tr className="text-xs font-medium text-gray-600">
                  <th className="text-left px-4 py-3">Dipendente</th>
                  <th className="text-center px-2 py-3">Stato</th>
                  <th className="text-right px-2 py-3">Tar. Giorn.</th>
                  <th className="text-right px-2 py-3">Tar. Str.</th>
                  <th className="text-right px-2 py-3">Contr. Giorn.</th>
                  <th className="text-left px-2 py-3">Telefono</th>
                  <th className="text-left px-2 py-3">Email</th>
                  <th className="text-left px-2 py-3">Ruolo</th>
                  <th className="text-left px-2 py-3">IBAN</th>
                  <th className="text-center px-2 py-3">Inserimento</th>
                  <th className="text-center px-2 py-3">Modifica</th>
                  <th className="text-right px-4 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr key={emp._id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {emp.lastName} {emp.firstName}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {emp.active !== false ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Attivo</span>
                      ) : (
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">Inattivo</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right text-sm text-gray-700">{fmt(emp.dailyRate)}</td>
                    <td className="px-2 py-3 text-right text-sm text-gray-700">{fmt(emp.overtimeRate)}</td>
                    <td className="px-2 py-3 text-right text-sm text-gray-700">{fmt(emp.dailyContribution)}</td>
                    <td className="px-2 py-3 text-sm text-gray-600 whitespace-nowrap">{emp.phone || "—"}</td>
                    <td className="px-2 py-3 text-sm text-gray-600 truncate max-w-[150px]">{emp.email || "—"}</td>
                    <td className="px-2 py-3 text-sm text-gray-600 whitespace-nowrap">{emp.role || "—"}</td>
                    <td className="px-2 py-3 text-xs font-mono text-gray-500 truncate max-w-[160px]">{emp.iban || "—"}</td>
                    <td className="px-2 py-3 text-center text-xs text-gray-500 whitespace-nowrap">{fmtDate(emp.createdAt)}</td>
                    <td className="px-2 py-3 text-center text-xs text-gray-500 whitespace-nowrap">{fmtDate(emp.updatedAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dipendenti/${emp._id}`)}
                        className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100 transition mr-2"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(emp._id)}
                        className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-lg hover:bg-red-100 transition"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-sm text-gray-400 mt-4">{filtered.length} dipendenti</p>
      </div>
    </div>
  );
}
