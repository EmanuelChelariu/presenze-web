import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Benvenuto, {session.user.name}
        </h1>
        <p className="text-gray-500 mb-8">
          {session.user.companyName} — {session.user.role}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <DashboardCard title="Inserimento Presenze" href="/presenze" icon="📋" />
          <DashboardCard title="Dipendenti" href="/dipendenti" icon="👷" />
          <DashboardCard title="Cantieri" href="/cantieri" icon="🏗️" />
          <DashboardCard title="Totali Mensili" href="/totali" icon="📊" />
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
