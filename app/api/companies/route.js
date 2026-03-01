import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";

// GET - lista aziende
export async function GET() {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  const companies = await Company.find({ active: true }).sort({ name: 1 });
  return Response.json(companies);
}

// POST - crea azienda
export async function POST(req) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return Response.json({ error: "Nome obbligatorio" }, { status: 400 });

  await connectDB();
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const company = await Company.create({ name, slug, active: true });
  return Response.json(company, { status: 201 });
}
