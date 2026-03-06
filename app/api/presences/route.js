import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import Employee from "@/models/Employee";
import Site from "@/models/Site";
import Company from "@/models/Company";

// GET /api/presences?date=YYYY-MM-DD&siteId=xxx
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const siteId = searchParams.get("siteId");

    await connectDB();

    const filter = {};

    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T23:59:59.999Z");
      filter.date = { $gte: start, $lte: end };
    }

    if (siteId) filter.siteId = siteId;

    const presences = await Presence.find(filter)
      .sort({ employeeName: 1 })
      .lean();

    return Response.json(presences);
  } catch (err) {
    console.error("[API] GET /api/presences error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// POST /api/presences
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, siteId, date, status, overtimeHours } = body;

    if (!employeeId || !siteId || !date || !status) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    await connectDB();

    // Controlla duplicato: stesso dipendente, stesso giorno
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");

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

    // Recupera nome azienda del dipendente
    const company = await Company.findById(employee.companyId);
    const companyName = company ? company.name : "";

    const presence = await Presence.create({
      companyId: employee.companyId,
      employeeId,
      employeeName: employee.fullName,
      companyName,
      siteId,
      siteName: site.name,
      date: new Date(date + "T00:00:00.000Z"),
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
  } catch (err) {
    console.error("[API] POST /api/presences error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
