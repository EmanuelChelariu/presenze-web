import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Site from "@/models/Site";
import Presence from "@/models/Presence";
import { ROLE_LABELS } from "@/lib/roles";

const RUOLI_UFFICIO = ["Amministrazione Ufficio", "Legale Rappresentante", "Segreteria tecnica"];

async function getStats() {
  await connectDB();

  const today = new Date();
  const dayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

  const [employees, sites, presenzeOggi] = await Promise.all([
    Employee.find({}).lean(),
    Site.find({}).lean(),
    Presence.countDocuments({ date: { $gte: dayStart, $lte: dayEnd } }),
  ]);

  const attivi = employees.filter((e) => e.active !== false);
  const operai = attivi.filter((e) => !RUOLI_UFFICIO.includes(e.role));
  const cantieriOperativi = sites.filter((s) => s.operativo);

  return {
    dipendentiAttivi: attivi.length,
    operai: operai.length,
    cantieriOperativi: cantieriOperativi.length,
    cantieriTotali: sites.length,
    presenzeOggi,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;

  // Operaio: redirect alla pagina dedicata
  if (role === "operaio") redirect("/operaio");

  const isAdmin = role === "admin";
  const isUfficio = role === "ufficio";
  const isInserimento = role === "inserimento";

  const stats = isAdmin || isUfficio ? await getStats() : null;

  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Ciao, {session.user.name?.split(" ")[0]}
              </h1>
              <p className="text-gray-500 mt-1">{today}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{session.user.companyName}</p>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Dipendenti attivi" value={stats.dipendentiAttivi} sub={`${stats.operai} operai`} color="teal" />
            <StatCard label="Cantieri operativi" value={stats.cantieriOperativi} sub={`${stats.cantieriTotali} totali`} color="slate" />
            <StatCard label="Presenze oggi" value={stats.presenzeOggi} sub="inserite" color="emerald" />
            <StatCard label="Operai sui cantieri" value={stats.operai} sub="in forza" color="amber" />
          </div>
        )}

        {/* Navigazione — sezione operativa */}
        {(isAdmin || isUfficio || isInserimento) && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Operatività</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <NavCard
                href="/presenze"
                title="Inserimento Presenze"
                desc="Registra presenze, assenze e straordinari"
                icon={<IconClipboard />}
                accent="teal"
              />
              <NavCard
                href="/totali"
                title="Totale Presenze"
                desc="Riepilogo mensile per dipendente"
                icon={<IconChart />}
                accent="teal"
              />
              <NavCard
                href="/rapportini"
                title="Rapportini"
                desc="Rapportini giornalieri per cantiere"
                icon={<IconDocument />}
                accent="teal"
              />
              <NavCard
                href="/rimborsi"
                title="Rimborsi e Trattenute"
                desc="Gestione rimborsi e trattenute"
                icon={<IconCreditCard />}
                accent="teal"
              />
            </div>
          </div>
        )}

        {/* Navigazione — sezione contabilità */}
        {(isAdmin || isUfficio) && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contabilità</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <NavCard
                href="/contabilita"
                title="Contabilità Mensile"
                desc="Costi per dipendente con export PDF"
                icon={<IconWallet />}
                accent="emerald"
              />
              <NavCard
                href="/contabilita-cantieri"
                title="Contabilità Cantieri"
                desc="Costi per cantiere con totali e PDF"
                icon={<IconBuilding />}
                accent="emerald"
              />
            </div>
          </div>
        )}

        {/* Navigazione — sezione anagrafica */}
        {(isAdmin || isUfficio) && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Anagrafica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <NavCard
                href="/dipendenti"
                title="Dipendenti"
                desc="Anagrafica completa, tariffe e contatti"
                icon={<IconUsers />}
                accent="slate"
              />
              <NavCard
                href="/cantieri"
                title="Cantieri"
                desc="Gestione cantieri e stato operativo"
                icon={<IconHardHat />}
                accent="slate"
              />
              {isAdmin && (
                <NavCard
                  href="/utenti"
                  title="Utenti"
                  desc="Account, ruoli e permessi di accesso"
                  icon={<IconShield />}
                  accent="slate"
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── Componenti ──────────────────────────────────────────── */

function StatCard({ label, value, sub, color }) {
  const colors = {
    teal: "border-teal-500 bg-white",
    slate: "border-slate-400 bg-white",
    emerald: "border-emerald-500 bg-white",
    amber: "border-amber-500 bg-white",
  };
  const valueColors = {
    teal: "text-teal-700",
    slate: "text-slate-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };

  return (
    <div className={`rounded-xl shadow-sm p-4 border-l-4 ${colors[color]}`}>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColors[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function NavCard({ href, title, desc, icon, accent }) {
  const accents = {
    teal: "group-hover:bg-teal-600",
    emerald: "group-hover:bg-emerald-600",
    slate: "group-hover:bg-slate-700",
  };
  const iconBg = {
    teal: "bg-teal-50 text-teal-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <a
      href={href}
      className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-5 flex items-start gap-4 transition-all duration-200 relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 w-1 h-full bg-transparent ${accents[accent]} transition-all duration-200`} />
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </a>
  );
}

/* ─── Icone SVG ───────────────────────────────────────────── */

function IconClipboard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
    </svg>
  );
}

function IconCreditCard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconHardHat() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
