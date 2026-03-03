import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import "@/models/Company";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  const employees = await Employee.find({ active: true })
    .populate("companyId", "name")
    .sort({ lastName: 1, firstName: 1 });

  return Response.json(employees);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

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
    fullName: `${firstName} ${lastName}`.trim(),
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
}
