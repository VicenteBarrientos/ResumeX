import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) return null;

        const passwordMatch = await compare(credentials.password, user.passwordHash);
        if (!passwordMatch) return null;

        return { id: user.id, name: user.username, email: user.email ?? user.username };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        // Prefer an existing Google-created stub (empty passwordHash).
        let existing = await db.user.findFirst({
          where: { email, passwordHash: "" },
        });

        if (!existing) {
          // Anti-takeover: credentials accounts can claim any email without
          // verification. Clear unverified credentials claims on this email
          // so Google sign-in cannot be hijacked by pre-registration.
          await db.user.updateMany({
            where: {
              email,
              passwordHash: { not: "" },
            },
            data: { email: null },
          });

          existing = await db.user.create({
            data: {
              username: email.split("@")[0] + "_" + Date.now().toString(36),
              email,
              passwordHash: "",
            },
          });
        }

        user.id = existing.id;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) token.id = user.id;
      // For Google sign-in, resolve id from a Google stub (empty password),
      // never from an unverified credentials row.
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findFirst({
          where: { email: token.email, passwordHash: "" },
        });
        if (dbUser) token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name;
      }
      return session;
    },
  },
};
