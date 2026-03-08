import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Rimborso from "@/models/Rimborso";
import Employee from "@/models/Employee";
import Site from "@/models/Site";

// GET /api/rimborsi?month=YYYY-MM
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const filter = {};
    if (month) {
      const [y, m] = month.split("-").map(Number);
      filter.date = { $gte: new Date(Date.UTC(y, m - 1, 1)), $lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)) };
    }

    await connectDB();
    const rimborsi = await Rimborso.find(filter).sort({ date: -1 }).lean();
    return Response.json(rimborsi);
  } catch (err) {
    console.error("[API] GET /api/rimborsi error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// POST /api/rimborsi
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, siteId, date, amount, note } = body;

    if (!employeeId || !date || amount === undefined) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findById(employeeId);
    const site = siteId ? await Site.findById(siteId) : null;

    const rimborso = await Rimborso.create({
      companyId: session.user.companyId,
      employeeId,
      employeeName: employee?.fullName || "",
      siteId: siteId || null,
      siteName: site?.name || "",
      date: new Date(date),
      amount: Number(amount),
      note: note || "",
    });

    return Response.json(rimborso, { status: 201 });
  } catch (err) {
    console.error("[API] POST /api/rimborsi error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
