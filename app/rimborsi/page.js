"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n) {
  const v = Number(n || 0);
  return (v >= 0 ? "+ " : "- ") + Math.abs(v).toLocaleString("it-IT", { minimumFractionDigits: 2 }) + " €";
}

export default function RimborsiPage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [rimborsi, setRimborsi] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form
  const [form, setForm] = useState({ employeeId: "", siteId: "", date: new Date().toISOString().split("T")[0], amount: "", tipo: "+", note: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    fetch("/api/employees").then(r => r.json()).then(setEmployees);
    fetch("/api/sites").then(r => r.json()).then(setSites);
  }, []);

  useEffect(() => { loadRimborsi(); }, [month]);

  async function loadRimborsi() {
    setLoading(true);
    const res = await fetch(`/api/rimborsi?month=${month}`);
    const data = await res.json();
    setRimborsi(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function set(f, v) { setForm(prev => ({ ...prev, [f]: v })); }

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const amount = form.tipo === "+" ? Math.abs(Number(form.amount)) : -Math.abs(Number(form.amount));
    const res = await fetch("/api/rimborsi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error || "Errore"); return; }
    setForm({ employeeId: "", siteId: "", date: new Date().toISOString().split("T")[0], amount: "", tipo: "+", note: "" });
    await loadRimborsi();
  }

  async function handleDelete(id) {
    if (!confirm("Eliminare questo rimborso?")) return;
    await fetch(`/api/rimborsi/${id}`, { method: "DELETE" });
    setRimborsi(prev => prev.filter(r => r._id !== id));
  }

  async function handleSaveEdit(id) {
    const res = await fetch(`/api/rimborsi/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(editAmount), note: editNote, date: rimborsi.find(r => r._id === id)?.date }),
    });
    if (!res.ok) { alert("Errore nel salvataggio"); return; }
    setEditId(null);
    await loadRimborsi();
  }

  const [y, m] = month.split("-").map(Number);
  const meseLabel = `${MESI[m - 1]} ${y}`;
  const totale = rimborsi.reduce((s, r) => s + Number(r.amount || 0), 0);

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Dashboard</button>
          <h1 className="text-2xl font-bold text-gray-800">Rimborsi e Detrazioni</h1>
        </div>

        {/* Form aggiunta */}
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-5 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Aggiungi rimborso / detrazione</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Dipendente *</label>
              <select required value={form.employeeId} onChange={e => set("employeeId", e.target.value)} className={inputClass}>
                <option value="">Seleziona...</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.lastName} {e.firstName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cantiere</label>
              <select value={form.siteId} onChange={e => set("siteId", e.target.value)} className={inputClass}>
                <option value="">— Nessuno —</option>
                {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data *</label>
              <input type="date" required value={form.date} onChange={e => set("date", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => set("tipo", e.target.value)} className={inputClass}>
                <option value="+">+ Rimborso</option>
                <option value="-">− Detrazione</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Importo € *</label>
              <input type="number" required min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note</label>
              <input type="text" value={form.note} onChange={e => set("note", e.target.value)} className={inputClass} placeholder="Descrizione..." />
            </div>
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? "Salvataggio..." : "+ Aggiungi"}
          </button>
        </form>

        {/* Filtro mese */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Mese</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="font-semibold text-gray-700">{meseLabel}</span>
            <span className={`text-sm font-semibold ${totale >= 0 ? "text-green-600" : "text-red-500"}`}>
              Totale: {fmt(totale)}
            </span>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-8">Caricamento...</p>
          ) : rimborsi.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nessun rimborso per questo mese</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500">
                  <th className="text-left px-4 py-2">Data</th>
                  <th className="text-left px-4 py-2">Dipendente</th>
                  <th className="text-left px-4 py-2">Cantiere</th>
                  <th className="text-left px-4 py-2">Note</th>
                  <th className="text-right px-4 py-2">Importo</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rimborsi.map((r, i) => (
                  <tr key={r._id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(r.date).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.siteName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {editId === r._id ? (
                        <input value={editNote} onChange={e => setEditNote(e.target.value)} className="border rounded px-2 py-1 text-sm w-full" />
                      ) : r.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {editId === r._id ? (
                        <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="border rounded px-2 py-1 text-sm w-24 text-right" />
                      ) : (
                        <span className={Number(r.amount) >= 0 ? "text-green-600" : "text-red-500"}>
                          {fmt(r.amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      {editId === r._id ? (
                        <>
                          <button onClick={() => handleSaveEdit(r._id)} className="text-sm text-green-600 hover:underline">Salva</button>
                          <button onClick={() => setEditId(null)} className="text-sm text-gray-400 hover:underline">Annulla</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(r._id); setEditAmount(r.amount); setEditNote(r.note || ""); }} className="text-sm text-blue-600 hover:underline">Modifica</button>
                          <button onClick={() => handleDelete(r._id)} className="text-sm text-red-500 hover:underline">Elimina</button>
                        </>
                      )}
                    </td>
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
