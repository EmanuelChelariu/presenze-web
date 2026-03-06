"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ROLE_LABELS = {
  admin: "Admin",
  ufficio: "Ufficio",
  inserimento: "Inserimento",
  operaio: "Operaio",
};

const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700",
  ufficio: "bg-blue-100 text-blue-700",
  inserimento: "bg-amber-100 text-amber-700",
  operaio: "bg-teal-100 text-teal-700",
};

export default function UtentiPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email} ${u.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function handleDeactivate(id, name) {
    if (!confirm(`Vuoi disattivare l'utente "${name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore durante la disattivazione");
        return;
      }
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, active: false } : u));
    } catch {
      alert("Errore di rete");
    }
  }

  const attivi = filtered.filter((u) => u.active !== false).length;
  const inattivi = filtered.filter((u) => u.active === false).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Gestione Utenti</h1>
          </div>
          <button
            onClick={() => router.push("/utenti/nuovo")}
            className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            + Aggiungi
          </button>
        </div>

        {/* Ricerca */}
        <input
          type="text"
          placeholder="Cerca per nome, email, ruolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
        />

        <p className="text-sm text-gray-400 mb-4">
          {filtered.length} utenti — <span className="text-gray-600 font-medium">{attivi} attivi</span> · <span className="text-gray-600 font-medium">{inattivi} inattivi</span>
        </p>

        {/* Lista */}
        {loading ? (
          <p className="text-center text-gray-500 py-12">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nessun utente trovato</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((user) => (
              <div key={user._id} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50/50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900 text-base">{user.name}</span>
                    {user.active !== false ? (
                      <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-medium">Attivo</span>
                    ) : (
                      <span className="bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full text-xs font-medium">Inattivo</span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/utenti/${user._id}`)}
                      className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition font-medium"
                    >
                      Modifica
                    </button>
                    {user.active !== false && (
                      <button
                        onClick={() => handleDeactivate(user._id, user.name)}
                        className="text-xs bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 px-5 py-4 text-sm">
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Email</span>
                    <span className="text-gray-700 break-all">{user.email}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Creato il</span>
                    <span className="text-gray-600">{fmtDate(user.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-0.5">Ultima modifica</span>
                    <span className="text-gray-600">{fmtDate(user.updatedAt)}</span>
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
