import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Site from "@/models/Site";

export async function GET() {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  const sites = await Site.find({}).sort({ name: 1 });
  return Response.json(sites);
}

export async function POST(req) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const { name, operativo, address, committente, startDate, companyId } = body;

  if (!name || !companyId) {
    return Response.json({ error: "Nome e azienda obbligatori" }, { status: 400 });
  }

  await connectDB();
  const site = await Site.create({
    name,
    operativo: operativo !== false,
    address: address || "",
    committente: committente || "",
    startDate: startDate ? new Date(startDate) : null,
    companyId,
  });

  return Response.json(site, { status: 201 });
}
