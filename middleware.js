import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Se non autenticato, lascia gestire a next-auth
  if (!token) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Operaio: può accedere solo a /operaio, /profilo, /login, /api/operaio, /api/profilo, /api/auth
  if (token.role === "operaio") {
    const allowedPaths = ["/operaio", "/profilo", "/login", "/api/operaio", "/api/profilo", "/api/auth"];
    const isAllowed =
      allowedPaths.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/logo") ||
      pathname === "/";

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/operaio", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
