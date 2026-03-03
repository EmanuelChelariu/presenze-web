import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import Employee from "@/models/Employee";
import Rimborso from "@/models/Rimborso";
import Site from "@/models/Site";
import mongoose from "mongoose";

// Funzione helper per ottenere la tariffa corretta
// Usa il snapshot della presenza se > 0, altrimenti la tariffa attuale del dipendente
function getRate(presenceValue, employeeValue) {
  return (presenceValue && presenceValue > 0) ? presenceValue : (employeeValue || 0);
}

// Calcola il costo totale di un set di presenze
function calcTotal(presences, empById) {
  let total = 0;
  presences.forEach((p) => {
    const emp = empById[String(p.employeeId)];
    if (!emp) return;

    const dailyRate = getRate(p.dailyRate, emp.dailyRate);
    const overtimeRate = getRate(p.overtimeRate, emp.overtimeRate);
    const dailyContribution = getRate(p.dailyContribution, emp.dailyContribution);
    const overtimeHours = Number(p.overtimeHours) || 0;

    total += dailyRate + (overtimeRate * overtimeHours) + dailyContribution;
  });
  return total;
}

// GET /api/contabilita-cantieri?siteId=xxx&month=YYYY-MM
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const month = searchParams.get("month");

  if (!siteId || !month) {
    return Response.json({ error: "siteId e month obbligatori" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, m - 1, 1));
  const monthEnd = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

  await connectDB();

  const siteObjId = new mongoose.Types.ObjectId(siteId);

  // Get site info
  const site = await Site.findById(siteId).lean();

  // Tutti i dipendenti (per tariffe)
  const employees = await Employee.find({}).lean();
  const empById = {};
  employees.forEach((e) => { empById[String(e._id)] = e; });

  // Presenze del mese per questo cantiere (solo Presente)
  const presences = await Presence.find({
    siteId: siteObjId,
    date: { $gte: monthStart, $lte: monthEnd },
    status: "Presente",
  }).lean();

  // Rimborsi del mese per questo cantiere
  const rimborsi = await Rimborso.find({
    siteId: siteObjId,
    date: { $gte: monthStart, $lte: monthEnd },
  }).lean();

  const rimborsiByEmp = {};
  rimborsi.forEach((r) => {
    const id = String(r.employeeId);
    if (!rimborsiByEmp[id]) rimborsiByEmp[id] = 0;
    rimborsiByEmp[id] += Number(r.amount) || 0;
  });

  // Calcola totali per dipendente (mese)
  const totals = {};

  presences.forEach((p) => {
    const empId = String(p.employeeId);
    const emp = empById[empId];
    if (!emp) return;

    const dailyRate = getRate(p.dailyRate, emp.dailyRate);
    const overtimeRate = getRate(p.overtimeRate, emp.overtimeRate);
    const dailyContribution = getRate(p.dailyContribution, emp.dailyContribution);
    const overtimeHours = Number(p.overtimeHours) || 0;

    if (!totals[empId]) {
      totals[empId] = {
        employeeId: empId,
        fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        giorni: 0,
        straordinari: 0,
        dailyRate: dailyRate,
        overtimeRate: overtimeRate,
        dailyContribution: dailyContribution,
        totaleDailyAmount: 0,
        totaleOvertimeAmount: 0,
        totaleContributo: 0,
      };
    }

    totals[empId].giorni += 1;
    totals[empId].straordinari += overtimeHours;
    totals[empId].dailyRate = dailyRate;
    totals[empId].overtimeRate = overtimeRate;
    totals[empId].dailyContribution = dailyContribution;
    totals[empId].totaleDailyAmount += dailyRate;
    totals[empId].totaleOvertimeAmount += overtimeRate * overtimeHours;
    totals[empId].totaleContributo += dailyContribution;
  });

  // Aggiungi dipendenti che hanno solo rimborsi (senza presenze) per questo cantiere
  Object.keys(rimborsiByEmp).forEach((empId) => {
    if (!totals[empId]) {
      const emp = empById[empId];
      if (!emp) return;
      totals[empId] = {
        employeeId: empId,
        fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        giorni: 0,
        straordinari: 0,
        dailyRate: emp.dailyRate || 0,
        overtimeRate: emp.overtimeRate || 0,
        dailyContribution: emp.dailyContribution || 0,
        totaleDailyAmount: 0,
        totaleOvertimeAmount: 0,
        totaleContributo: 0,
      };
    }
  });

  // Rows per mese
  const rows = Object.values(totals)
    .map((row) => {
      const rimborso = rimborsiByEmp[row.employeeId] || 0;
      return { ...row, rimborsi: rimborso };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Totale del mese (paga + straordinari + contributi + rimborsi)
  const totaleMese = rows.reduce((s, r) =>
    s + r.totaleDailyAmount + r.totaleOvertimeAmount + r.totaleContributo + r.rimborsi, 0);

  // === TOTALE DALL'INIZIO CANTIERE (fino ad OGGI, non fino al mese selezionato) ===
  const siteStart = site?.startDate ? new Date(site.startDate) : new Date(Date.UTC(2020, 0, 1));
  const today = new Date();
  const todayEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

  const allPresences = await Presence.find({
    siteId: siteObjId,
    date: { $gte: siteStart, $lte: todayEnd },
    status: "Presente",
  }).lean();

  let totaleInizio = calcTotal(allPresences, empById);

  // Rimborsi totali dall'inizio cantiere
  const allRimborsi = await Rimborso.find({
    siteId: siteObjId,
    date: { $gte: siteStart, $lte: todayEnd },
  }).lean();
  allRimborsi.forEach((r) => { totaleInizio += Number(r.amount) || 0; });

  // Cantieri con presenze nel mese selezionato
  const siteIdsInMonth = await Presence.distinct("siteId", {
    date: { $gte: monthStart, $lte: monthEnd },
  });
  const sitesInMonth = await Site.find({ _id: { $in: siteIdsInMonth } }).lean();
  const cantieriMese = sitesInMonth.map((s) => ({ _id: String(s._id), name: s.name }));

  return Response.json({
    rows,
    totaleMese,
    totaleInizio,
    cantieriMese,
  });
}
