"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    `${e.firstName} ${e.lastName} ${e.fullName} ${e.badgeId} ${e.companyId?.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function handleDelete(id) {
    if (!confirm("Vuoi disattivare questo dipendente?")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((e) => e._id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Dipendenti</h1>
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
          placeholder="Cerca per nome, badge, azienda..."
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
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[30%]">Nome</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[15%]">Badge</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[22%]">Azienda</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-[15%]">Telefono</th>
                  <th className="text-right px-4 py-3 w-[18%]"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr key={emp._id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 truncate">
                      {emp.lastName} {emp.firstName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm font-mono">
                        {emp.badgeId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm truncate">{emp.companyId?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{emp.phone || "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dipendenti/${emp._id}`)}
                        className="text-sm text-blue-600 hover:underline mr-3"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(emp._id)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Rimuovi
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
