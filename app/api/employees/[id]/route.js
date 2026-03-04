import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import "@/models/Company";

// GET singolo dipendente
export async function GET(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

    const { id } = await context.params;
    await connectDB();
    const employee = await Employee.findById(id).populate("companyId", "name");
    if (!employee) return Response.json({ error: "Non trovato" }, { status: 404 });
    return Response.json(employee);
  } catch (err) {
    console.error("[API] GET /api/employees/[id] error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// PUT - modifica dipendente
export async function PUT(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const {
      firstName, lastName, badgeId, phone, email,
      iban, role, companyId, dailyRate, overtimeRate,
      dailyContribution, active, ratesChanged,
    } = body;

    await connectDB();

    if (badgeId) {
      const existing = await Employee.findOne({ badgeId: badgeId.toUpperCase(), _id: { $ne: id } });
      if (existing) return Response.json({ error: "Badge già esistente" }, { status: 400 });
    }

    const update = {
      firstName, lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      badgeId: badgeId?.toUpperCase(),
      phone, email, iban, role, companyId,
      dailyRate: Number(dailyRate) || 0,
      overtimeRate: Number(overtimeRate) || 0,
      dailyContribution: Number(dailyContribution) || 0,
      active: active !== false,
    };

    // Se le tariffe sono cambiate, aggiorna ratesEffectiveFrom a inizio mese corrente
    if (ratesChanged) {
      const now = new Date();
      update.ratesEffectiveFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const employee = await Employee.findByIdAndUpdate(id, update, { new: true }).populate("companyId", "name");
    if (!employee) return Response.json({ error: "Dipendente non trovato" }, { status: 404 });
    return Response.json(employee);
  } catch (err) {
    console.error("[API] PUT /api/employees/[id] error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// DELETE - disattiva dipendente
export async function DELETE(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

    const { id } = await context.params;
    await connectDB();
    await Employee.findByIdAndUpdate(id, { active: false });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[API] DELETE /api/employees/[id] error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
