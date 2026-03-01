import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import "@/models/Company";

// GET singolo dipendente
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  const employee = await Employee.findById(params.id).populate("companyId", "name");
  if (!employee) return Response.json({ error: "Non trovato" }, { status: 404 });
  return Response.json(employee);
}

// PUT - modifica dipendente
export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const {
    firstName, lastName, badgeId, phone, email,
    iban, role, companyId, dailyRate, overtimeRate,
    dailyContribution, active, ratesChanged,
  } = body;

  await connectDB();

  if (badgeId) {
    const existing = await Employee.findOne({ badgeId: badgeId.toUpperCase(), _id: { $ne: params.id } });
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

  const employee = await Employee.findByIdAndUpdate(params.id, update, { new: true }).populate("companyId", "name");
  if (!employee) return Response.json({ error: "Dipendente non trovato" }, { status: 404 });
  return Response.json(employee);
}

// DELETE - disattiva dipendente
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  await Employee.findByIdAndUpdate(params.id, { active: false });
  return Response.json({ ok: true });
}
