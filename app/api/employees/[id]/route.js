import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";

// PUT - modifica dipendente
export async function PUT(req, { params }) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const { name, surname, badgeId, phone, companyId, active } = body;

  await connectDB();

  // Controlla badge duplicato (escludendo se stesso)
  if (badgeId) {
    const existing = await Employee.findOne({
      badgeId: badgeId.toUpperCase(),
      _id: { $ne: params.id },
    });
    if (existing) return Response.json({ error: "Badge già esistente" }, { status: 400 });
  }

  const employee = await Employee.findByIdAndUpdate(
    params.id,
    { name, surname, badgeId: badgeId?.toUpperCase(), phone, companyId, active },
    { new: true }
  ).populate("companyId", "name");

  if (!employee) return Response.json({ error: "Dipendente non trovato" }, { status: 404 });

  return Response.json(employee);
}

// DELETE - disattiva dipendente
export async function DELETE(req, { params }) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  await Employee.findByIdAndUpdate(params.id, { active: false });

  return Response.json({ ok: true });
}
