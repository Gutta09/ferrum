import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { collections, DB_ENABLED } from "./mongo";
import { DEMO_USER_ID } from "./owner";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// real email + password, verified against the database (bcrypt)
providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (creds) => {
      if (!DB_ENABLED) return null; // demo mode has no accounts
      const email = String(creds?.email ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      const { users } = await collections();
      const user = await users.findOne({ email });
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return { id: user._id, name: user.name, email: user.email };
    },
  })
);

// one-click demo entry — a real session on the seeded demo account
providers.push(
  CredentialsProvider({
    id: "demo",
    name: "Demo lifter",
    credentials: {},
    // the demo account is a pure seed showcase — no database touched, so it
    // always works even if the DB is unreachable
    authorize: async () => ({ id: DEMO_USER_ID, name: "Bhargav", email: "demo@ferrum.local" }),
  })
);

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = (token.uid as string) ?? token.sub;
      }
      return session;
    },
  },
};

export const auth = () => getServerSession(authOptions);
