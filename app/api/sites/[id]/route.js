import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Site from "@/models/Site";

export async function GET(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();
    const site = await Site.findById(id);
    if (!site) return Response.json({ error: "Non trovato" }, { status: 404 });
    return Response.json(site);
  } catch (err) {
    console.error("[API] GET /api/sites/[id] error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

export async function PUT(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { name, operativo, address, committente, startDate, companyId } = body;

    await connectDB();
    const site = await Site.findByIdAndUpdate(
      id,
      { name, operativo, address, committente, startDate: startDate ? new Date(startDate) : null, companyId },
      { new: true }
    );

    if (!site) return Response.json({ error: "Cantiere non trovato" }, { status: 404 });
    return Response.json(site);
  } catch (err) {
    console.error("[API] PUT /api/sites/[id] error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();
    await Site.findByIdAndUpdate(id, { operativo: false });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[API] DELETE /api/sites/[id] error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
