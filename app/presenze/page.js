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

export default function PresenzePage() {
  const router = useRouter();

  const [date, setDate] = useState(today());
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form nuovo inserimento
  const [form, setForm] = useState({ employeeId: "", status: "Presente", overtimeHours: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Carica cantieri e dipendenti all'avvio
  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((data) => {
      const operativi = data.filter((s) => s.operativo);
      setSites(operativi);
      if (operativi.length > 0) setSiteId(operativi[0]._id);
    });
    fetch("/api/employees").then((r) => r.json()).then(setEmployees);
  }, []);

  // Carica presenze quando cambia data o cantiere
  useEffect(() => {
    if (!date || !siteId) return;
    setLoading(true);
    fetch(`/api/presences?date=${date}&siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => { setPresences(data); setLoading(false); });
  }, [date, siteId]);

  // Dipendenti già presenti oggi (per escluderli dal form)
  const presentIds = new Set(presences.map((p) => String(p.employeeId)));
  const availableEmployees = employees.filter((e) => !presentIds.has(String(e._id)));

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    const res = await fetch("/api/presences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, siteId, date }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error || "Errore durante il salvataggio");
    } else {
      setPresences((prev) => [...prev, data].sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || "")));
      setForm({ employeeId: "", status: "Presente", overtimeHours: "" });
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminare questa presenza?")) return;
    await fetch(`/api/presences/${id}`, { method: "DELETE" });
    setPresences((prev) => prev.filter((p) => p._id !== id));
  }

  function startEdit(p) {
    setEditId(p._id);
    setEditForm({
      employeeId: String(p.employeeId),
      status: p.status,
      overtimeHours: p.overtimeHours || "",
      siteId: String(p.siteId),
      date,
    });
  }

  async function handleSaveEdit() {
    const res = await fetch(`/api/presences/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setPresences((prev) => prev.map((p) => p._id === editId ? { ...p, ...data } : p));
    setEditId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Inserimento Presenze</h1>
          </div>
        </div>

        {/* Filtri data + cantiere */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Cantiere</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona cantiere...</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Form aggiunta presenza */}
        {siteId && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Aggiungi presenza</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  required
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona dipendente...</option>
                  {availableEmployees.map((e) => (
                    <option key={e._id} value={e._id}>{e.lastName} {e.firstName}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.overtimeHours}
                  onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Str. ore"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
              >
                {saving ? "..." : "+ Aggiungi"}
              </button>
            </div>
            {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}
          </form>
        )}

        {/* Lista presenze del giorno */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Presenze — {new Date(date + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="text-sm text-gray-400">{presences.length} dipendenti</span>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-8">Caricamento...</p>
          ) : presences.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nessuna presenza inserita per questo giorno</p>
          ) : (
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-[35%]">Dipendente</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-[20%]">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-[20%]">Straordinari</th>
                  <th className="text-right px-4 py-2 w-[25%]"></th>
                </tr>
              </thead>
              <tbody>
                {presences.map((p) => (
                  <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                    {editId === p._id ? (
                      <>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.employeeId}
                            onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                            className="border rounded px-2 py-1 text-sm w-full"
                          >
                            {employees.map((e) => <option key={e._id} value={e._id}>{e.lastName} {e.firstName}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="border rounded px-2 py-1 text-sm w-full"
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="0" step="0.5"
                            value={editForm.overtimeHours}
                            onChange={(e) => setEditForm({ ...editForm, overtimeHours: e.target.value })}
                            className="border rounded px-2 py-1 text-sm w-20"
                          />
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button onClick={handleSaveEdit} className="text-sm text-green-600 hover:underline mr-3">Salva</button>
                          <button onClick={() => setEditId(null)} className="text-sm text-gray-500 hover:underline">Annulla</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.employeeName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {p.overtimeHours > 0 ? `${p.overtimeHours}h` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => startEdit(p)} className="text-sm text-blue-600 hover:underline mr-3">Modifica</button>
                          <button onClick={() => handleDelete(p._id)} className="text-sm text-red-500 hover:underline">Elimina</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
