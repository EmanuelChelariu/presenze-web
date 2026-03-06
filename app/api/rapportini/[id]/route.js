import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Rapportino from "@/models/Rapportino";
import Site from "@/models/Site";

// PUT /api/rapportini/:id
export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
    return Response.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { siteId, date, text } = body;

  await connectDB();

  const update = {};
  if (text !== undefined) update.text = text.trim();
  if (date) update.date = new Date(date + "T00:00:00.000Z");
  if (siteId) {
    const site = await Site.findById(siteId).lean();
    if (site) {
      update.siteId = siteId;
      update.siteName = site.name;
    }
  }

  const rapportino = await Rapportino.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!rapportino) return Response.json({ error: "Rapportino non trovato" }, { status: 404 });

  return Response.json(rapportino);
}

// DELETE /api/rapportini/:id
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
    return Response.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { id } = await params;

  await connectDB();

  const rapportino = await Rapportino.findByIdAndDelete(id);
  if (!rapportino) return Response.json({ error: "Rapportino non trovato" }, { status: 404 });

  return Response.json({ success: true });
}
