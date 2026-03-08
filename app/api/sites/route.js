import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Site from "@/models/Site";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    await connectDB();
    const sites = await Site.find({}).sort({ name: 1 });
    return Response.json(sites);
  } catch (err) {
    console.error("[API] GET /api/sites error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

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
  } catch (err) {
    console.error("[API] POST /api/sites error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
