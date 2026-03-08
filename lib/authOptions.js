import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rateLimit";
import User from "@/models/User";
import "@/models/Company";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          // Rate limiting — blocca dopo 5 tentativi falliti in 1 minuto
          const headersList = await headers();
          const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
          const { blocked, resetIn } = checkRateLimit(ip);
          if (blocked) {
            throw new Error(`Troppi tentativi. Riprova tra ${resetIn} secondi.`);
          }

          await connectDB();
          const user = await User.findOne({
            email: credentials.email.toLowerCase().trim(),
            active: true,
          }).populate("companyId");
          if (!user) return null;
          const isValid = await user.comparePassword(credentials.password);
          if (!isValid) return null;
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId._id.toString(),
            companyName: user.companyId.name,
            employeeId: user.employeeId ? user.employeeId.toString() : null,
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
        token.employeeId = user.employeeId || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
        session.user.employeeId = token.employeeId || null;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
