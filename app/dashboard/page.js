import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const isAdmin = role === "admin";
  const isUfficio = role === "ufficio";
  const isSupervisore = role === "Supervisore Cantieri";
  const isCapoSquadra = role === "Capo Squadra";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Benvenuto, {session.user.name}
            </h1>
            <p className="text-gray-500">
              {session.user.companyName} — <span className="text-blue-600">{role}</span>
            </p>
          </div>
          <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-600">
            Esci →
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Tutti */}
          {(isAdmin || isSupervisore || isCapoSquadra) && (
            <DashboardCard title="Inserimento Presenze" href="/presenze" icon="📋" />
          )}
          {(isAdmin || isUfficio || isSupervisore || isCapoSquadra) && (
            <DashboardCard title="Totale per Cantiere" href="/totali" icon="📊" />
          )}

          {/* Admin + ufficio */}
          {(isAdmin || isUfficio) && (
            <DashboardCard title="Contabilità Mese" href="/contabilita" icon="💰" />
          )}

          {/* Solo admin */}
          {isAdmin && (
            <>
              <DashboardCard title="Dipendenti" href="/dipendenti" icon="👷" />
              <DashboardCard title="Cantieri" href="/cantieri" icon="🏗️" />
              <DashboardCard title="Rimborsi" href="/rimborsi" icon="💳" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, href, icon }) {
  return (
    <a
      href={href}
      className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-3 hover:shadow-md transition cursor-pointer"
    >
      <span className="text-4xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 text-center">{title}</span>
    </a>
  );
}
