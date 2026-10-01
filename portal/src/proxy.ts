import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Checagem otimista: sem cookie de sessão, nem tenta renderizar a área logada.
// A validação de verdade acontece no servidor (getCtx).
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
