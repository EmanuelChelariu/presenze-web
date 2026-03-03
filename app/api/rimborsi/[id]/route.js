import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Rimborso from "@/models/Rimborso";

export async function PUT(req, context) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();
  await connectDB();
  const rimborso = await Rimborso.findByIdAndUpdate(
    id,
    { amount: Number(body.amount), note: body.note || "", date: new Date(body.date) },
    { new: true }
  );
  if (!rimborso) return Response.json({ error: "Non trovato" }, { status: 404 });
  return Response.json(rimborso);
}

export async function DELETE(req, context) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await context.params;
  await connectDB();
  await Rimborso.findByIdAndDelete(id);
  return Response.json({ ok: true });
}
