import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";

// GET /api/totali?month=YYYY-MM
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (!["admin", "ufficio", "inserimento"].includes(session.user.role)) {
    return Response.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // es. "2026-03"

  if (!month) {
    return Response.json({ error: "month obbligatorio" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

  await connectDB();

  const rows = await Presence.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$employeeId",
        employeeName: { $first: "$employeeName" },
        presenze: {
          $sum: { $cond: [{ $eq: ["$status", "Presente"] }, 1, 0] },
        },
        assenze: {
          $sum: { $cond: [{ $eq: ["$status", "Assente"] }, 1, 0] },
        },
        malattie: {
          $sum: { $cond: [{ $eq: ["$status", "Malattia"] }, 1, 0] },
        },
        ferie: {
          $sum: { $cond: [{ $eq: ["$status", "Ferie"] }, 1, 0] },
        },
        infortuni: {
          $sum: { $cond: [{ $eq: ["$status", "Infortunio"] }, 1, 0] },
        },
        straordinari: { $sum: "$overtimeHours" },
        totaleGiorni: { $sum: 1 },
      },
    },
    { $sort: { employeeName: 1 } },
  ]);

  return Response.json(rows);
}
