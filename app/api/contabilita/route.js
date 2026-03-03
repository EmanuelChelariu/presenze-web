import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import Employee from "@/models/Employee";
import Rimborso from "@/models/Rimborso";

function getRate(presenceValue, employeeValue) {
  return (presenceValue && presenceValue > 0) ? presenceValue : (employeeValue || 0);
}

// GET /api/contabilita?month=YYYY-MM
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) return Response.json({ error: "month obbligatorio" }, { status: 400 });

  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

  await connectDB();

  const presences = await Presence.find({
    date: { $gte: start, $lte: end },
    status: "Presente",
  }).lean();

  const employees = await Employee.find({}).lean();
  const empById = {};
  employees.forEach((e) => { empById[String(e._id)] = e; });

  const rimborsi = await Rimborso.find({
    date: { $gte: start, $lte: end },
  }).lean();

  const rimborsiByEmp = {};
  rimborsi.forEach((r) => {
    const id = String(r.employeeId);
    if (!rimborsiByEmp[id]) rimborsiByEmp[id] = 0;
    rimborsiByEmp[id] += Number(r.amount) || 0;
  });

  const totals = {};

  presences.forEach((p) => {
    const empId = String(p.employeeId);
    const emp = empById[empId];
    if (!emp) return;

    const dailyRate = getRate(p.dailyRate, emp.dailyRate);
    const overtimeRate = getRate(p.overtimeRate, emp.overtimeRate);
    const overtimeHours = Number(p.overtimeHours) || 0;

    if (!totals[empId]) {
      totals[empId] = {
        employeeId: empId,
        firstName: emp.firstName || "",
        lastName: emp.lastName || "",
        fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        iban: emp.iban || "",
        giorni: 0,
        straordinari: 0,
        totaleDailyAmount: 0,
        totaleOvertimeAmount: 0,
        dailyRate: dailyRate,
        overtimeRate: overtimeRate,
      };
    }

    totals[empId].giorni += 1;
    totals[empId].straordinari += overtimeHours;
    totals[empId].dailyRate = dailyRate;
    totals[empId].overtimeRate = overtimeRate;
    totals[empId].totaleDailyAmount += dailyRate;
    totals[empId].totaleOvertimeAmount += overtimeRate * overtimeHours;
  });

  // Aggiungi dipendenti che hanno solo rimborsi (senza presenze)
  Object.keys(rimborsiByEmp).forEach((empId) => {
    if (!totals[empId]) {
      const emp = empById[empId];
      if (!emp) return;
      totals[empId] = {
        employeeId: empId,
        firstName: emp.firstName || "",
        lastName: emp.lastName || "",
        fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        iban: emp.iban || "",
        giorni: 0,
        straordinari: 0,
        totaleDailyAmount: 0,
        totaleOvertimeAmount: 0,
        dailyRate: emp.dailyRate || 0,
        overtimeRate: emp.overtimeRate || 0,
      };
    }
  });

  const rows = Object.values(totals)
    .map((row) => {
      const rimborso = rimborsiByEmp[row.employeeId] || 0;
      const totale = row.totaleDailyAmount + row.totaleOvertimeAmount + rimborso;
      return {
        ...row,
        rimborsi: rimborso,
        totale,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return Response.json(rows);
}
