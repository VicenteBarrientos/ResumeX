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
        // Auto-create user on first Google sign-in
        const existing = await db.user.findFirst({ where: { email: user.email! } });
        if (!existing) {
          const created = await db.user.create({
            data: {
              username: user.email!.split("@")[0] + "_" + Date.now().toString(36),
              email: user.email!,
              passwordHash: "",
            },
          });
          user.id = created.id;
        } else {
          user.id = existing.id;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) token.id = user.id;
      // For Google sign-in, always resolve id from DB via email
      if (account?.provider === "google") {
        const dbUser = await db.user.findFirst({ where: { email: token.email! } });
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
