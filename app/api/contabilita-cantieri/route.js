import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import Employee from "@/models/Employee";
import Rimborso from "@/models/Rimborso";
import Site from "@/models/Site";
import mongoose from "mongoose";

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

  // Get site info for startDate
  const site = await Site.findById(siteId).lean();

  // Presenze del mese per questo cantiere (solo Presente)
  const presences = await Presence.find({
    siteId: siteObjId,
    date: { $gte: monthStart, $lte: monthEnd },
    status: "Presente",
  }).lean();

  // Tutti i dipendenti
  const employees = await Employee.find({}).lean();
  const empById = {};
  employees.forEach((e) => { empById[String(e._id)] = e; });

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

    if (!totals[empId]) {
      totals[empId] = {
        employeeId: empId,
        fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        giorni: 0,
        straordinari: 0,
        dailyRate: 0,
        overtimeRate: 0,
        dailyContribution: 0,
        totaleDailyAmount: 0,
        totaleOvertimeAmount: 0,
        totaleContributo: 0,
      };
    }

    const presenceDate = new Date(p.date);
    const presenceMonthStart = new Date(presenceDate.getFullYear(), presenceDate.getMonth(), 1);
    const ratesMonthStart = emp.ratesEffectiveFrom
      ? new Date(new Date(emp.ratesEffectiveFrom).getFullYear(), new Date(emp.ratesEffectiveFrom).getMonth(), 1)
      : new Date(0);

    const useCurrentRates = presenceMonthStart >= ratesMonthStart;

    const dailyRate = useCurrentRates ? (emp.dailyRate || 0) : (p.dailyRate || 0);
    const overtimeRate = useCurrentRates ? (emp.overtimeRate || 0) : (p.overtimeRate || 0);
    const dailyContribution = useCurrentRates ? (emp.dailyContribution || 0) : (p.dailyContribution || 0);
    const overtimeHours = Number(p.overtimeHours) || 0;

    totals[empId].giorni += 1;
    totals[empId].straordinari += overtimeHours;
    totals[empId].dailyRate = dailyRate;
    totals[empId].overtimeRate = overtimeRate;
    totals[empId].dailyContribution = dailyContribution;
    totals[empId].totaleDailyAmount += dailyRate;
    totals[empId].totaleOvertimeAmount += overtimeRate * overtimeHours;
    totals[empId].totaleContributo += dailyContribution;
  });

  // Rows per mese
  const rows = Object.values(totals)
    .map((row) => {
      const rimborso = rimborsiByEmp[row.employeeId] || 0;
      const totale = row.totaleDailyAmount + row.totaleOvertimeAmount + rimborso;
      return { ...row, rimborsi: rimborso, totale };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Totale del mese
  const totaleMese = rows.reduce((s, r) => s + r.totale, 0);

  // Totale dall'inizio cantiere
  const siteStart = site?.startDate ? new Date(site.startDate) : new Date(Date.UTC(2020, 0, 1));

  const allPresences = await Presence.find({
    siteId: siteObjId,
    date: { $gte: siteStart, $lte: monthEnd },
    status: "Presente",
  }).lean();

  let totaleInizio = 0;
  allPresences.forEach((p) => {
    const empId = String(p.employeeId);
    const emp = empById[empId];
    if (!emp) return;

    const presenceDate = new Date(p.date);
    const presenceMonthStart = new Date(presenceDate.getFullYear(), presenceDate.getMonth(), 1);
    const ratesMonthStart = emp.ratesEffectiveFrom
      ? new Date(new Date(emp.ratesEffectiveFrom).getFullYear(), new Date(emp.ratesEffectiveFrom).getMonth(), 1)
      : new Date(0);
    const useCurrentRates = presenceMonthStart >= ratesMonthStart;

    const dailyRate = useCurrentRates ? (emp.dailyRate || 0) : (p.dailyRate || 0);
    const overtimeRate = useCurrentRates ? (emp.overtimeRate || 0) : (p.overtimeRate || 0);
    const overtimeHours = Number(p.overtimeHours) || 0;

    totaleInizio += dailyRate + (overtimeRate * overtimeHours);
  });

  // Rimborsi totali dall'inizio
  const allRimborsi = await Rimborso.find({
    siteId: siteObjId,
    date: { $gte: siteStart, $lte: monthEnd },
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
