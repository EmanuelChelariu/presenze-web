import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Rapportino from "@/models/Rapportino";
import Site from "@/models/Site";

// GET /api/rapportini?date=YYYY-MM-DD&siteId=xxx
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
    return Response.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const siteId = searchParams.get("siteId");

  await connectDB();

  const filter = {};

  if (date) {
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");
    filter.date = { $gte: start, $lte: end };
  }

  if (siteId) filter.siteId = siteId;

  const rapportini = await Rapportino.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return Response.json(rapportini);
}

// POST /api/rapportini
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
    return Response.json({ error: "Accesso negato" }, { status: 403 });
  }

  const body = await req.json();
  const { siteId, date, text } = body;

  if (!siteId || !date || !text?.trim()) {
    return Response.json({ error: "Cantiere, data e testo obbligatori" }, { status: 400 });
  }

  await connectDB();

  const site = await Site.findById(siteId).lean();
  if (!site) return Response.json({ error: "Cantiere non trovato" }, { status: 404 });

  const rapportino = await Rapportino.create({
    companyId: session.user.companyId,
    siteId,
    siteName: site.name,
    date: new Date(date + "T00:00:00.000Z"),
    text: text.trim(),
    createdBy: {
      userId: session.user.id,
      name: session.user.name,
      role: session.user.role,
    },
  });

  return Response.json(rapportino, { status: 201 });
}
