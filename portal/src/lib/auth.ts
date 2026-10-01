import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "./db";

export const auth = betterAuth({
  appName: "Garra",
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // TODO(produção): requireEmailVerification + envio de e-mail
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
