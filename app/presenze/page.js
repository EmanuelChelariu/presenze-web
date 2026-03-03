"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = ["Presente", "Assente", "Malattia", "Ferie", "Infortunio"];

const STATUS_COLORS = {
  Presente:   "bg-green-100 text-green-700",
  Assente:    "bg-red-100 text-red-600",
  Malattia:   "bg-yellow-100 text-yellow-700",
  Ferie:      "bg-blue-100 text-blue-700",
  Infortunio: "bg-orange-100 text-orange-700",
};

const today = () => new Date().toISOString().split("T")[0];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT");
}

function fmtDateLong(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function PresenzePage() {
  const router = useRouter();

  const [date, setDate] = useState(today());
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form nuovo inserimento
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", siteId: "", status: "Presente", overtimeHours: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit mode — quando editId !== null, il form si usa per modificare
  const [editId, setEditId] = useState(null);

  // Carica cantieri e dipendenti all'avvio
  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((data) => {
      setSites(data.filter((s) => s.operativo));
    });
    fetch("/api/employees").then((r) => r.json()).then(setEmployees);
  }, []);

  // Carica TUTTE le presenze del giorno (tutti i cantieri)
  useEffect(() => {
    if (!date) return;
    setLoading(true);
    fetch(`/api/presences?date=${date}`)
      .then((r) => r.json())
      .then((data) => { setPresences(Array.isArray(data) ? data : []); setLoading(false); });
  }, [date]);

  // Operai attivi (esclusi ruoli d'ufficio)
  const RUOLI_UFFICIO = ["Amministrazione Ufficio", "Legale Rappresentante", "Segreteria tecnica"];
  const operaiAttivi = employees.filter((e) => !RUOLI_UFFICIO.includes(e.role)).length;

  // Dipendenti già presenti oggi (per escluderli dal form di aggiunta)
  const presentIds = new Set(presences.map((p) => String(p.employeeId)));
  const availableEmployees = editId
    ? employees // in edit mode mostra tutti
    : employees.filter((e) => !presentIds.has(String(e._id)));

  function resetForm() {
    setForm({ employeeId: "", siteId: "", status: "Presente", overtimeHours: "" });
    setFormError("");
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(p) {
    setEditId(p._id);
    setForm({
      employeeId: String(p.employeeId),
      siteId: String(p.siteId),
      status: p.status,
      overtimeHours: p.overtimeHours || "",
    });
    setShowForm(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    if (editId) {
      // Modifica
      const res = await fetch(`/api/presences/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) { setFormError(data.error || "Errore"); return; }
      setPresences((prev) => prev.map((p) => p._id === editId ? { ...p, ...data } : p));
      resetForm();
    } else {
      // Nuovo inserimento
      const res = await fetch("/api/presences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) { setFormError(data.error || "Errore"); return; }
      setPresences((prev) => [...prev, data].sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || "")));
      resetForm();
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminare questa presenza?")) return;
    await fetch(`/api/presences/${id}`, { method: "DELETE" });
    setPresences((prev) => prev.filter((p) => p._id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Inserimento Presenze</h1>
          <p className="text-sm text-gray-500 mt-1">
            ⭐ Operai attivi sui cantieri: <span className="font-semibold text-gray-700">{operaiAttivi}</span>
          </p>
        </div>

        {/* Data selector */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
          />
        </div>

        {/* Pulsanti azione — allineati e simmetrici */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => { if (editId) resetForm(); else setShowForm(!showForm); }}
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-black hover:text-black transition text-center"
          >
            {editId ? "✕ Annulla Modifica" : showForm ? "✕ Chiudi Form" : "⊕ Nuova Presenza"}
          </button>
          <button
            onClick={() => router.push("/rimborsi")}
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-black hover:text-black transition text-center"
          >
            ⊕ Aggiungi Rimborso/Trattenuta
          </button>
          <button
            onClick={() => router.push("/rapportini")}
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-black hover:text-black transition text-center"
          >
            ⊕ Aggiungi Rapportino
          </button>
        </div>

        {/* Form aggiunta / modifica presenza */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {editId ? "✏️ Modifica Presenza" : "Nuova Presenza"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dipendente *</label>
                <select
                  required
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Seleziona dipendente...</option>
                  {availableEmployees.map((e) => (
                    <option key={e._id} value={e._id}>{e.lastName} {e.firstName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cantiere *</label>
                <select
                  required
                  value={form.siteId}
                  onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Seleziona cantiere...</option>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stato</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Straordinari (h)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.overtimeHours}
                  onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="0"
                />
              </div>
            </div>
            {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}
            <div className="mt-3 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {saving ? "Salvataggio..." : editId ? "Salva Modifiche" : "+ Aggiungi"}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Annulla
                </button>
              )}
            </div>
          </form>
        )}

        {/* Messaggio presenze inserite */}
        {presences.length > 0 && (
          <p className="text-sm text-green-600 font-medium mb-3 italic">
            Presenze inserite in questo giorno: {presences.length}
          </p>
        )}

        {/* Tabella presenze del giorno */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Presenze — {fmtDateLong(date)}
            </span>
            <span className="text-sm text-gray-400">{presences.length} presenze</span>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-8">Caricamento...</p>
          ) : presences.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nessuna presenza inserita per questo giorno</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-medium text-gray-600">
                    <th className="text-left px-3 py-2 w-8">#</th>
                    <th className="text-left px-3 py-2">Nome e Cognome</th>
                    <th className="text-left px-3 py-2">Cantiere</th>
                    <th className="text-left px-3 py-2">Stato</th>
                    <th className="text-center px-3 py-2">Str.</th>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Autore</th>
                    <th className="text-right px-3 py-2 w-32">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {presences.map((p, i) => (
                    <tr
                      key={p._id}
                      className={`border-b last:border-0 hover:bg-gray-50 ${editId === p._id ? "bg-yellow-50" : i % 2 !== 0 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{p.employeeName}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">{p.siteName || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-gray-600">
                        {p.overtimeHours > 0 ? p.overtimeHours : "0"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{fmtDate(p.date)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{p.createdByName || "—"}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEdit(p)}
                          className="bg-green-500 text-white text-xs px-3 py-1 rounded hover:bg-green-600 transition mr-1"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="text-xs text-red-400 hover:text-red-600 hover:underline"
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
        </div>

      </div>
    </div>
  );
}
