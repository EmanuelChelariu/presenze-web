import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";

// GET /api/operaio?month=YYYY-MM
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (session.user.role !== "operaio") {
      return Response.json({ error: "Accesso negato" }, { status: 403 });
    }
    if (!session.user.employeeId) {
      return Response.json({ error: "Nessun dipendente collegato al tuo account. Contatta l'amministratore." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    await connectDB();

    const employeeId = session.user.employeeId;

    // Presenza di oggi
    const today = new Date();
    const dayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dayEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

    const todayPresence = await Presence.findOne({
      employeeId,
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    // Presenze del mese
    let monthStart, monthEnd;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      monthStart = new Date(Date.UTC(y, m - 1, 1));
      monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    } else {
      monthStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
      monthEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    const monthlyPresences = await Presence.find({
      employeeId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).sort({ date: -1 }).lean();

    return Response.json({
      today: todayPresence ? {
        status: todayPresence.status,
        siteName: todayPresence.siteName,
        overtimeHours: todayPresence.overtimeHours,
      } : null,
      presences: monthlyPresences.map((p) => ({
        _id: p._id,
        date: p.date,
        status: p.status,
        siteName: p.siteName || "—",
        overtimeHours: p.overtimeHours || 0,
      })),
      employeeName: todayPresence?.employeeName || monthlyPresences[0]?.employeeName || session.user.name,
    });
  } catch (err) {
    console.error("[API] GET /api/operaio error:", err);
    return Response.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
