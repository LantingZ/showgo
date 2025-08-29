import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's database id. */
      id: string;
    } & DefaultSession["user"];
  }
}
