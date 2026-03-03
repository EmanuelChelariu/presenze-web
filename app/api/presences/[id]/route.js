import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Presence from "@/models/Presence";
import Employee from "@/models/Employee";
import Site from "@/models/Site";

// PUT - modifica presenza
export async function PUT(req, context) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();
  const { employeeId, siteId, date, status, overtimeHours } = body;

  await connectDB();

  // Controlla duplicato escludendo se stesso
  if (employeeId && date) {
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");

    const duplicate = await Presence.findOne({
      employeeId,
      date: { $gte: dayStart, $lte: dayEnd },
      _id: { $ne: id },
    });

    if (duplicate) {
      return Response.json({ error: "Presenza già inserita per questo dipendente in questa data" }, { status: 400 });
    }
  }

  const employee = await Employee.findById(employeeId);
  const site = await Site.findById(siteId);

  const presence = await Presence.findByIdAndUpdate(
    id,
    {
      employeeId,
      employeeName: employee?.fullName,
      siteId,
      siteName: site?.name,
      date: new Date(date + "T00:00:00.000Z"),
      status,
      overtimeHours: Number(overtimeHours) || 0,
    },
    { new: true }
  );

  if (!presence) return Response.json({ error: "Presenza non trovata" }, { status: 404 });
  return Response.json(presence);
}

// DELETE - elimina presenza
export async function DELETE(req, context) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await context.params;
  await connectDB();
  await Presence.findByIdAndDelete(id);
  return Response.json({ ok: true });
}
