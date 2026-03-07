import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import DDT from "@/models/DDT";
import { uploadToDrive } from "@/lib/googleDrive";

// GET — lista DDT per data
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    await connectDB();

    const query = {};
    if (dateStr) {
      const start = new Date(dateStr + "T00:00:00.000Z");
      const end = new Date(dateStr + "T23:59:59.999Z");
      query.date = { $gte: start, $lte: end };
    }

    const ddts = await DDT.find(query).sort({ createdAt: -1 }).lean();
    return Response.json(ddts);
  } catch (err) {
    console.error("[API] GET /api/ddt error:", err);
    return Response.json({ error: err.message || "Errore interno" }, { status: 500 });
  }
}

// POST — upload DDT su Google Drive
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ error: "Nessun file selezionato" }, { status: 400 });
    }

    // Valida tipo file
    if (file.type !== "application/pdf") {
      return Response.json({ error: "Solo file PDF sono accettati" }, { status: 400 });
    }

    // Valida dimensione (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return Response.json({ error: "Il file supera il limite di 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || `DDT_${new Date().toISOString()}.pdf`;

    // Upload su Google Drive
    const { fileId, webViewLink } = await uploadToDrive(buffer, fileName);

    // Salva metadati in MongoDB
    await connectDB();
    const ddt = await DDT.create({
      fileName,
      googleDriveFileId: fileId,
      googleDriveUrl: webViewLink,
      date: new Date(),
      uploadedBy: {
        userId: session.user.id,
        name: session.user.name,
        role: session.user.role,
      },
    });

    return Response.json(ddt, { status: 201 });
  } catch (err) {
    console.error("[API] POST /api/ddt error:", err);
    return Response.json({ error: err.message || "Errore durante l'upload" }, { status: 500 });
  }
}
