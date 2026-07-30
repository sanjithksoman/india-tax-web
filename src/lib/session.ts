import { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;
}

// SESSION_SECRET must be at least 32 characters.
// Set this in your .env.local and Vercel environment variables.
const secret = process.env.SESSION_SECRET ?? "india-tax-tracker-dev-secret-key-32ch";

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "india_tax_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: "lax",
  },
};
