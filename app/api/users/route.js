import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Company";

// GET - lista utenti (solo admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (session.user.role !== "admin") return Response.json({ error: "Accesso negato" }, { status: 403 });

    await connectDB();
    const users = await User.find({ companyId: session.user.companyId })
      .select("-password")
      .populate("companyId", "name")
      .sort({ name: 1 });

    return Response.json(users);
  } catch (err) {
    console.error("[API] GET /api/users error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// POST - crea utente (solo admin)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (session.user.role !== "admin") return Response.json({ error: "Accesso negato" }, { status: 403 });

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return Response.json({ error: "Email già registrata" }, { status: 400 });

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      companyId: session.user.companyId,
      active: true,
    });

    // Auto-link operaio to employee by email
    if (role === "operaio") {
      const Employee = (await import("@/models/Employee")).default;
      const matchingEmployee = await Employee.findOne({
        email: email.toLowerCase().trim(),
        companyId: session.user.companyId,
        active: true,
      });
      if (matchingEmployee) {
        user.employeeId = matchingEmployee._id;
        await user.save();
      }
    }

    const { password: _, ...userObj } = user.toObject();
    return Response.json(userObj, { status: 201 });
  } catch (err) {
    console.error("[API] POST /api/users error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
