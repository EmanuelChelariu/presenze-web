import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// GET - info utente corrente
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.user.id).select("-password");
    if (!user) return Response.json({ error: "Utente non trovato" }, { status: 404 });
    return Response.json(user);
  } catch (err) {
    console.error("[API] GET /api/profilo error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// PUT - cambio password
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Non autorizzato" }, { status: 401 });

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return Response.json({ error: "Inserisci la password attuale e quella nuova" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ error: "La nuova password deve avere almeno 6 caratteri" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return Response.json({ error: "Utente non trovato" }, { status: 404 });

    // Verifica password attuale
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return Response.json({ error: "Password attuale non corretta" }, { status: 400 });
    }

    // Imposta nuova password e salva (attiva hook bcrypt pre-save)
    user.password = newPassword;
    await user.save();

    return Response.json({ ok: true, message: "Password aggiornata con successo" });
  } catch (err) {
    console.error("[API] PUT /api/profilo error:", err);
    return Response.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
