"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export default function RapportiniPage() {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [siteFilter, setSiteFilter] = useState("");
  const [sites, setSites] = useState([]);
  const [rapportini, setRapportini] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ siteId: "", date: today(), text: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Carica cantieri
  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setSites(data); }).catch(() => {});
  }, []);

  // Carica rapportini del giorno
  useEffect(() => {
    if (!date) return;
    setLoading(true);
    let url = `/api/rapportini?date=${date}`;
    if (siteFilter) url += `&siteId=${siteFilter}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setRapportini(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date, siteFilter]);

  function resetForm() {
    setEditId(null);
    setForm({ siteId: "", date: date, text: "" });
    setFormError("");
    setShowForm(false);
  }

  function startEdit(r) {
    setEditId(r._id);
    const rDate = new Date(r.date).toISOString().split("T")[0];
    setForm({
      siteId: String(r.siteId),
      date: rDate,
      text: r.text || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    if (editId) {
      const res = await fetch(`/api/rapportini/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) { setFormError(data.error || "Errore"); return; }
      setRapportini((prev) => prev.map((r) => r._id === editId ? { ...r, ...data } : r));
      resetForm();
    } else {
      const res = await fetch("/api/rapportini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) { setFormError(data.error || "Errore"); return; }
      // Se la data del form corrisponde alla data visualizzata, aggiungi alla lista
      const formDateStr = form.date;
      if (formDateStr === date) {
        setRapportini((prev) => [data, ...prev]);
      }
      resetForm();
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminare questo rapportino?")) return;
    const res = await fetch(`/api/rapportini/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRapportini((prev) => prev.filter((r) => r._id !== id));
    }
  }

  // Cantieri con rapportini nel giorno selezionato (per filtro veloce)
  const siteIdsInDay = [...new Set(rapportini.map((r) => String(r.siteId)))];
  const sitesInDay = sites.filter((s) => siteIdsInDay.includes(String(s._id)));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <button onClick={() => router.push("/presenze")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Presenze
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Rapportini</h1>
        </div>

        {/* Data selector + filtro cantiere */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Filtra per cantiere</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition"
            >
              <option value="">Tutti i cantieri</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Pulsante nuovo rapportino */}
        <div className="mb-4">
          <button
            onClick={() => { if (editId) resetForm(); else { setForm({ ...form, date }); setShowForm(!showForm); } }}
            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-black hover:text-black transition text-center"
          >
            {editId ? "✕ Annulla Modifica" : showForm ? "✕ Chiudi Form" : "⊕ Nuovo Rapportino"}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {editId ? "Modifica Rapportino" : "Nuovo Rapportino"}
            </h2>

            {formError && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded mb-3">{formError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cantiere *</label>
                <select
                  value={form.siteId}
                  onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Seleziona cantiere...</option>
                  {sites.filter((s) => s.operativo).map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">Testo rapportino *</label>
              <textarea
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                required
                rows={5}
                placeholder="Descrivi le attività svolte..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-y"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {saving ? "Salvataggio..." : editId ? "Aggiorna" : "Inserisci"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 rounded-lg font-medium text-gray-500 hover:text-gray-700 transition"
              >
                Annulla
              </button>
            </div>
          </form>
        )}

        {/* Titolo giorno */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700 capitalize">
            {fmtDateLong(date)}
          </h2>
          <span className="text-sm text-gray-400">
            {rapportini.length} rapportin{rapportini.length === 1 ? "o" : "i"}
          </span>
        </div>

        {/* Lista rapportini */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Caricamento...</p>
        ) : rapportini.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nessun rapportino per questa data</p>
        ) : (
          <div className="space-y-3">
            {rapportini.map((r) => (
              <div
                key={r._id}
                className={`bg-white rounded-xl shadow p-4 border-l-4 ${editId === r._id ? "border-l-yellow-400 bg-yellow-50" : "border-l-blue-400"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold text-gray-800">{r.siteName || "—"}</span>
                    <span className="text-gray-400 text-sm ml-2">— {fmtDate(r.date)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(r)}
                      className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100 transition"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-lg hover:bg-red-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.text}</p>
                <div className="mt-2 text-xs text-gray-400">
                  Inserito da: {r.createdBy?.name || "—"} — {fmtTime(r.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
