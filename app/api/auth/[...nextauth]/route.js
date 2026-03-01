import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Company";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] Credenziali mancanti");
            return null;
          }

          await connectDB();
          console.log("[AUTH] DB connesso, cerco utente:", credentials.email);

          const user = await User.findOne({
            email: credentials.email.toLowerCase().trim(),
            active: true,
          }).populate("companyId");

          if (!user) {
            console.log("[AUTH] Utente non trovato");
            return null;
          }

          console.log("[AUTH] Utente trovato:", user.email, "ruolo:", user.role);

          const isValid = await user.comparePassword(credentials.password);
          console.log("[AUTH] Password valida:", isValid);

          if (!isValid) return null;

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId._id.toString(),
            companyName: user.companyId.name,
          };
        } catch (err) {
          console.error("[AUTH] Errore:", err.message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
