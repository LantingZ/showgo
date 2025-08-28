import NextAuth, { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

if (!process.env.GITHUB_ID || !process.env.GITHUB_SECRET) {
  throw new Error("GITHUB_ID and GITHUB_SECRET environment variables must be set.");
}

export const authOptions: AuthOptions = {

  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: "jwt",
  },

  callbacks: {
    // to add the user ID to the token
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // reads the user ID from the token
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
