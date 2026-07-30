import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedEnv = process.env.ALLOWED_EMAILS || "";
      const allowedEmails = allowedEnv
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      if (!user.email || !allowedEmails.includes(user.email.toLowerCase())) {
        return false; // Reject unauthorized accounts
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});
