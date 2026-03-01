import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import Employee from "@/models/Employee";
import Site from "@/models/Site";

// GET /api/presences?date=YYYY-MM-DD&siteId=xxx
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const siteId = searchParams.get("siteId");

  await connectDB();

  const filter = {};

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }

  if (siteId) filter.siteId = siteId;

  const presences = await Presence.find(filter)
    .sort({ employeeName: 1 })
    .lean();

  return Response.json(presences);
}

// POST /api/presences
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const { employeeId, siteId, date, status, overtimeHours } = body;

  if (!employeeId || !siteId || !date || !status) {
    return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  await connectDB();

  // Controlla duplicato: stesso dipendente, stesso giorno
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const duplicate = await Presence.findOne({
    employeeId,
    date: { $gte: dayStart, $lte: dayEnd },
  });

  if (duplicate) {
    return Response.json({ error: "Presenza già inserita per questo dipendente in questa data" }, { status: 400 });
  }

  // Recupera snapshot tariffe dipendente
  const employee = await Employee.findById(employeeId);
  const site = await Site.findById(siteId);

  if (!employee) return Response.json({ error: "Dipendente non trovato" }, { status: 404 });
  if (!site) return Response.json({ error: "Cantiere non trovato" }, { status: 404 });

  const presence = await Presence.create({
    companyId: session.user.companyId,
    employeeId,
    employeeName: employee.fullName,
    siteId,
    siteName: site.name,
    date: dayStart,
    status,
    overtimeHours: Number(overtimeHours) || 0,
    // Snapshot tariffe
    dailyRate: employee.dailyRate || 0,
    overtimeRate: employee.overtimeRate || 0,
    dailyContribution: employee.dailyContribution || 0,
    createdByName: session.user.name,
    createdByEmail: session.user.email,
  });

  return Response.json(presence, { status: 201 });
}
