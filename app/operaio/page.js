"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_STYLE = {
  Presente: "bg-green-100 border-green-400 text-green-800",
  Assente: "bg-red-100 border-red-400 text-red-800",
  Malattia: "bg-yellow-100 border-yellow-400 text-yellow-800",
  Ferie: "bg-blue-100 border-blue-400 text-blue-800",
  Infortunio: "bg-orange-100 border-orange-400 text-orange-800",
};

const STATUS_BADGE = {
  Presente: "bg-green-100 text-green-700",
  Assente: "bg-red-100 text-red-700",
  Malattia: "bg-yellow-100 text-yellow-700",
  Ferie: "bg-blue-100 text-blue-700",
  Infortunio: "bg-orange-100 text-orange-700",
};

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1);
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export default function OperaioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [month, setMonth] = useState(getCurrentMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Redirect se non operaio
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "operaio") {
      router.replace("/dashboard");
    }
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [session, status, router]);

  // Fetch dati
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "operaio") return;

    setLoading(true);
    setError("");
    fetch(`/api/operaio?month=${month}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
          setData(null);
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Errore di connessione"))
      .finally(() => setLoading(false));
  }, [month, status, session]);

  function changeMonth(delta) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (session?.user?.role !== "operaio") return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Ciao, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{session.user.companyName}</p>
        </div>

        {/* Errore collegamento */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Card presenza di oggi */}
        {!error && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Oggi — {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </h2>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto" />
              </div>
            ) : data?.today ? (
              <div className={`rounded-xl border-2 p-6 text-center ${STATUS_STYLE[data.today.status] || "bg-gray-100 border-gray-300 text-gray-700"}`}>
                <p className="text-sm font-medium mb-2 opacity-70">La tua presenza oggi è</p>
                <p className="text-3xl font-bold">{data.today.status}</p>
                {data.today.siteName && (
                  <p className="text-sm mt-2 opacity-70">Cantiere: {data.today.siteName}</p>
                )}
                {data.today.overtimeHours > 0 && (
                  <p className="text-sm mt-1 opacity-70">Straordinari: {data.today.overtimeHours}h</p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">
                <p className="text-lg font-medium">Nessuna presenza registrata per oggi</p>
                <p className="text-sm mt-1">La tua presenza non è ancora stata inserita</p>
              </div>
            )}
          </div>
        )}

        {/* Presenze del mese */}
        {!error && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Le tue presenze
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center capitalize">
                  {monthLabel(month)}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto" />
              </div>
            ) : data?.presences?.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                {data.presences.map((p) => (
                  <div key={p._id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 font-medium min-w-[100px]">
                        {formatDate(p.date)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] || "bg-gray-100 text-gray-600"}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <span>{p.siteName}</span>
                      {p.overtimeHours > 0 && (
                        <span className="ml-2 text-amber-600 font-medium">+{p.overtimeHours}h</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-400 text-sm">
                Nessuna presenza per questo mese
              </div>
            )}

            {/* Riepilogo mese */}
            {data?.presences?.length > 0 && (
              <div className="mt-3 bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-400">Presenze</p>
                  <p className="text-lg font-bold text-green-700">
                    {data.presences.filter((p) => p.status === "Presente").length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Assenze</p>
                  <p className="text-lg font-bold text-red-600">
                    {data.presences.filter((p) => ["Assente", "Malattia", "Infortunio"].includes(p.status)).length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ferie</p>
                  <p className="text-lg font-bold text-blue-600">
                    {data.presences.filter((p) => p.status === "Ferie").length}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
