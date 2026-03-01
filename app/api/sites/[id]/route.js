import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Site from "@/models/Site";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  const site = await Site.findById(params.id);
  if (!site) return Response.json({ error: "Non trovato" }, { status: 404 });
  return Response.json(site);
}

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const { name, operativo, address, committente, startDate, companyId } = body;

  await connectDB();
  const site = await Site.findByIdAndUpdate(
    params.id,
    { name, operativo, address, committente, startDate: startDate ? new Date(startDate) : null, companyId },
    { new: true }
  );

  if (!site) return Response.json({ error: "Cantiere non trovato" }, { status: 404 });
  return Response.json(site);
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  await connectDB();
  await Site.findByIdAndUpdate(params.id, { operativo: false });
  return Response.json({ ok: true });
}
