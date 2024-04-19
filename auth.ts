import Google from "next-auth/providers/google";
import NextAuth from "next-auth";
import { prisma } from "./prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      try {
        // Upsert the user into the database
        const userData = await prisma.user.upsert({
          where: {
            email: user.email,
          },
          create: {
            email: user.email,
            username: user.name,
          },
          update: {},
        });

        return userData ? true : false; // Return true to sign in the user, false otherwise
      } catch (error) {
        console.error("Error upserting the user:", error);
        return false; // Return false to not sign in the user on error
      }
    },
  },
});
