import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";

// GET /api/totali/panorama?month=YYYY-MM
// Restituisce tutte le presenze del mese per generare il panorama PDF
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
    return Response.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  if (!month) {
    return Response.json({ error: "month obbligatorio" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

  await connectDB();

  const presences = await Presence.find({
    date: { $gte: start, $lte: end },
  })
    .select("employeeId employeeName companyName date status overtimeHours")
    .sort({ employeeName: 1, date: 1 })
    .lean();

  return Response.json(presences);
}
