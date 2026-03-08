import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import DDT from "@/models/DDT";
import { deleteFromDrive } from "@/lib/googleDrive";

// DELETE — elimina DDT da Drive e MongoDB
export async function DELETE(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (!["admin", "ufficio"].includes(session.user.role)) {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();

    const ddt = await DDT.findById(id);
    if (!ddt) return Response.json({ error: "DDT non trovato" }, { status: 404 });

    // Elimina da Google Drive
    try {
      await deleteFromDrive(ddt.googleDriveFileId);
    } catch (driveErr) {
      console.error("[API] Drive delete error:", driveErr.message);
      // Continua comunque con la rimozione dal DB
    }

    // Elimina da MongoDB
    await DDT.findByIdAndDelete(id);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[API] DELETE /api/ddt/[id] error:", err);
    return Response.json({ error: "Errore interno" }, { status: 500 });
  }
}
