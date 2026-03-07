"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const today = () => new Date().toISOString().split("T")[0];

export default function DDTPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [date, setDate] = useState(today());
  const [ddts, setDdts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Carica DDT per data
  useEffect(() => {
    if (!date) return;
    setLoading(true);
    fetch(`/api/ddt?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setDdts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date]);

  async function handleUpload() {
    if (!selectedFile) return;
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/ddt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore durante l'upload");
        setUploading(false);
        return;
      }

      // Aggiungi alla lista se la data è oggi
      if (date === today()) {
        setDdts((prev) => [data, ...prev]);
      }

      // Reset
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);
    } catch (err) {
      setError("Errore di connessione");
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminare questo DDT?")) return;
    try {
      const res = await fetch(`/api/ddt/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDdts((prev) => prev.filter((d) => d._id !== id));
      }
    } catch {
      // Ignora
    }
  }

  function fmtDateTime(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <button onClick={() => router.push("/presenze")} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Presenze
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Caricamento DDT</h1>
          <p className="text-sm text-gray-500 mt-1">Carica documenti di trasporto su Google Drive</p>
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

        {/* Upload section */}
        <div className="bg-white rounded-xl shadow p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Carica nuovo DDT</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs text-gray-500 mb-1">File PDF</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition whitespace-nowrap"
            >
              {uploading ? "Caricamento..." : "Carica DDT"}
            </button>
          </div>
          {selectedFile && (
            <p className="text-xs text-gray-400 mt-2">
              File selezionato: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* DDT List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              DDT caricati — {new Date(date + "T12:00:00").toLocaleDateString("it-IT", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </span>
            <span className="text-sm text-gray-400">{ddts.length} documenti</span>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-8">Caricamento...</p>
          ) : ddts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nessun DDT caricato per questo giorno</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-medium text-gray-600">
                    <th className="text-left px-3 py-2 w-8">#</th>
                    <th className="text-left px-3 py-2">Nome File</th>
                    <th className="text-left px-3 py-2">Autore</th>
                    <th className="text-left px-3 py-2">Data/Ora</th>
                    <th className="text-right px-3 py-2 w-40">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {ddts.map((d, i) => (
                    <tr
                      key={d._id}
                      className={`border-b last:border-0 hover:bg-blue-50 transition ${i % 2 !== 0 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 text-sm">{d.fileName}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">{d.uploadedBy?.name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{fmtDateTime(d.createdAt)}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <a
                          href={d.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600 transition mr-1 inline-block"
                        >
                          Apri
                        </a>
                        <button
                          onClick={() => handleDelete(d._id)}
                          className="text-xs text-red-400 hover:text-red-600 hover:underline"
                        >
                          Elimina
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
