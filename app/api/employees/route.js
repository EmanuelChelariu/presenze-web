import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Company from "@/models/Company";

// GET - lista dipendenti
export async function GET(req) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  const employees = await Employee.find({ active: true })
    .populate("companyId", "name")
    .sort({ surname: 1, name: 1 });

  return Response.json(employees);
}

// POST - crea dipendente
export async function POST(req) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const { name, surname, badgeId, phone, companyId } = body;

  if (!name || !surname || !badgeId || !companyId) {
    return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  await connectDB();

  const existing = await Employee.findOne({ badgeId: badgeId.toUpperCase() });
  if (existing) {
    return Response.json({ error: "Badge già esistente" }, { status: 400 });
  }

  const employee = await Employee.create({
    name,
    surname,
    badgeId: badgeId.toUpperCase(),
    phone: phone || "",
    companyId,
  });

  return Response.json(employee, { status: 201 });
}
