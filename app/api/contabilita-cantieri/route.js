import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import Employee from "@/models/Employee";
import Rimborso from "@/models/Rimborso";
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
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 0, 23, 59, 59, 999);

  await connectDB();

  // Presenze del mese per questo cantiere (solo Presente)
  const presences = await Presence.find({
    siteId: new mongoose.Types.ObjectId(siteId),
    date: { $gte: start, $lte: end },
    status: "Presente",
  }).lean();

  // Tutti i dipendenti
  const employees = await Employee.find({}).lean();
  const empById = {};
  employees.forEach((e) => { empById[String(e._id)] = e; });

  // Rimborsi del mese per questo cantiere
  const rimborsi = await Rimborso.find({
    siteId: new mongoose.Types.ObjectId(siteId),
    date: { $gte: start, $lte: end },
  }).lean();

  // Raggruppa rimborsi per dipendente
  const rimborsiByEmp = {};
  rimborsi.forEach((r) => {
    const id = String(r.employeeId);
    if (!rimborsiByEmp[id]) rimborsiByEmp[id] = 0;
    rimborsiByEmp[id] += Number(r.amount) || 0;
  });

  // Calcola totali per dipendente
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
        totaleDailyAmount: 0,
        totaleOvertimeAmount: 0,
      };
    }

    // Logica tariffe storiche vs attuali
    const presenceDate = new Date(p.date);
    const presenceMonthStart = new Date(presenceDate.getFullYear(), presenceDate.getMonth(), 1);
    const ratesMonthStart = emp.ratesEffectiveFrom
      ? new Date(new Date(emp.ratesEffectiveFrom).getFullYear(), new Date(emp.ratesEffectiveFrom).getMonth(), 1)
      : new Date(0);

    const useCurrentRates = presenceMonthStart >= ratesMonthStart;

    const dailyRate = useCurrentRates ? (emp.dailyRate || 0) : (p.dailyRate || 0);
    const overtimeRate = useCurrentRates ? (emp.overtimeRate || 0) : (p.overtimeRate || 0);
    const overtimeHours = Number(p.overtimeHours) || 0;

    totals[empId].giorni += 1;
    totals[empId].straordinari += overtimeHours;
    totals[empId].totaleDailyAmount += dailyRate;
    totals[empId].totaleOvertimeAmount += overtimeRate * overtimeHours;
  });

  // Risultato finale
  const rows = Object.values(totals)
    .map((row) => {
      const rimborso = rimborsiByEmp[row.employeeId] || 0;
      const totale = row.totaleDailyAmount + row.totaleOvertimeAmount + rimborso;
      return {
        ...row,
        rimborsi: rimborso,
        totale,
        dailyRateAvg: row.giorni > 0 ? row.totaleDailyAmount / row.giorni : 0,
        overtimeRateAvg: row.straordinari > 0 ? row.totaleOvertimeAmount / row.straordinari : 0,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return Response.json(rows);
}
