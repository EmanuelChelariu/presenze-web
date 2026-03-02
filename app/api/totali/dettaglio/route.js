import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import mongoose from "mongoose";

// GET /api/totali/dettaglio?employeeId=xxx&month=YYYY-MM
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");

  if (!employeeId || !month) {
    return Response.json({ error: "employeeId e month obbligatori" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

  await connectDB();

  const presences = await Presence.find({
    employeeId: new mongoose.Types.ObjectId(employeeId),
    date: { $gte: start, $lte: end },
  })
    .sort({ date: 1 })
    .lean();

  // Format for frontend
  const rows = presences.map((p) => ({
    _id: p._id,
    date: p.date,
    status: p.status,
    overtimeHours: p.overtimeHours || 0,
    siteName: p.siteName || "—",
    createdByName: p.createdByName || "—",
  }));

  return Response.json(rows);
}
