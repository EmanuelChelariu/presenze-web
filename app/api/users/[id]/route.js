import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Company";

// GET singolo utente (solo admin)
export async function GET(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (session.user.role !== "admin") return Response.json({ error: "Accesso negato" }, { status: 403 });

    const { id } = await context.params;
    await connectDB();
    const user = await User.findById(id).select("-password").populate("companyId", "name");
    if (!user) return Response.json({ error: "Non trovato" }, { status: 404 });
    return Response.json(user);
  } catch (err) {
    console.error("[API] GET /api/users/[id] error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// PUT - modifica utente (solo admin)
export async function PUT(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (session.user.role !== "admin") return Response.json({ error: "Accesso negato" }, { status: 403 });

    const { id } = await context.params;
    const body = await req.json();
    const { name, email, role, active, password } = body;

    await connectDB();

    // Controlla unicità email se cambiata
    if (email) {
      const existing = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id },
      });
      if (existing) return Response.json({ error: "Email già registrata" }, { status: 400 });
    }

    // Se password fornita, usa findById + save per attivare il hook bcrypt
    if (password) {
      const user = await User.findById(id);
      if (!user) return Response.json({ error: "Utente non trovato" }, { status: 404 });
      user.name = name;
      user.email = email.toLowerCase().trim();
      user.role = role;
      user.active = active !== false;
      user.password = password;
      await user.save();
      const { password: _, ...userObj } = user.toObject();
      return Response.json(userObj);
    }

    // Senza password: findByIdAndUpdate (non attiva pre-save, ok)
    const user = await User.findByIdAndUpdate(
      id,
      {
        name,
        email: email.toLowerCase().trim(),
        role,
        active: active !== false,
      },
      { new: true }
    ).select("-password").populate("companyId", "name");

    if (!user) return Response.json({ error: "Utente non trovato" }, { status: 404 });
    return Response.json(user);
  } catch (err) {
    console.error("[API] PUT /api/users/[id] error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// DELETE - disattiva utente (solo admin)
export async function DELETE(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });
    if (session.user.role !== "admin") return Response.json({ error: "Accesso negato" }, { status: 403 });

    const { id } = await context.params;

    // Impedisci auto-disattivazione
    if (id === session.user.id) {
      return Response.json({ error: "Non puoi disattivare il tuo account" }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndUpdate(id, { active: false });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[API] DELETE /api/users/[id] error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
