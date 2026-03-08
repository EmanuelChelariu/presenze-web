import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import "@/models/Company";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    await connectDB();
    const employees = await Employee.find({ active: true })
      .populate("companyId", "name")
      .sort({ lastName: 1, firstName: 1 });

    return Response.json(employees);
  } catch (err) {
    console.error("[API] GET /api/employees error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName, lastName, badgeId, phone, email,
      iban, role, companyId, dailyRate, overtimeRate,
      dailyContribution, active,
    } = body;

    if (!firstName || !lastName || !badgeId || !companyId) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    await connectDB();

    const existing = await Employee.findOne({ badgeId: badgeId.toUpperCase() });
    if (existing) return Response.json({ error: "Badge già esistente" }, { status: 400 });

    const employee = await Employee.create({
      firstName, lastName,
      badgeId: badgeId.toUpperCase(),
      phone: phone || "", email: email || "",
      iban: iban || "", role: role || "",
      companyId,
      dailyRate: Number(dailyRate) || 0,
      overtimeRate: Number(overtimeRate) || 0,
      dailyContribution: Number(dailyContribution) || 0,
      active: active !== false,
      ratesEffectiveFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    });

    return Response.json(employee, { status: 201 });
  } catch (err) {
    console.error("[API] POST /api/employees error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
