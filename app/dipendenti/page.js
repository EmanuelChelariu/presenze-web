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
      <div className="max-w-5xl mx-auto">
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

        <p className="text-sm text-gray-400 mb-4">{filtered.length} dipendenti</p>

        {/* Lista */}
        {loading ? (
          <p className="text-center text-gray-500 py-12">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nessun dipendente trovato</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((emp) => (
              <div key={emp._id} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Riga principale: nome + stato + azioni */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 text-base">
                      {emp.lastName} {emp.firstName}
                    </span>
                    {emp.active !== false ? (
                      <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-medium">Attivo</span>
                    ) : (
                      <span className="bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full text-xs font-medium">Inattivo</span>
                    )}
                    {emp.role && (
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-medium">{emp.role}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dipendenti/${emp._id}`)}
                      className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition font-medium"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(emp._id)}
                      className="text-xs bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Dettagli in griglia */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 px-5 py-4 text-sm">
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Tariffa giornaliera</span>
                    <span className="font-medium text-gray-800">{fmt(emp.dailyRate)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Tariffa straordinari</span>
                    <span className="font-medium text-gray-800">{fmt(emp.overtimeRate)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Contributo giornaliero</span>
                    <span className="font-medium text-gray-800">{fmt(emp.dailyContribution)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Telefono</span>
                    <span className="text-gray-700">{emp.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Email</span>
                    <span className="text-gray-700 break-all">{emp.email || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">IBAN</span>
                    <span className="text-gray-700 font-mono text-xs break-all">{emp.iban || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Data inserimento</span>
                    <span className="text-gray-600">{fmtDate(emp.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Ultima modifica</span>
                    <span className="text-gray-600">{fmtDate(emp.updatedAt)}</span>
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
