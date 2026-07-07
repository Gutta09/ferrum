import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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

// mock-tier entry: one click, a real session with a real user id
providers.push(
  CredentialsProvider({
    id: "demo",
    name: "Demo lifter",
    credentials: {},
    authorize: async () => ({
      id: DEMO_USER_ID,
      name: "Bhargav",
      email: "demo@ferrum.local",
    }),
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
