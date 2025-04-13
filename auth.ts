import Google from "next-auth/providers/google";
import NextAuth from "next-auth";
import { prisma } from "./prisma/client";

const useSecureCookies = process.env.NODE_ENV === 'production';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  cookies: {
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
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
            username: user.email,
          },
          update: {},
        });

        return userData ? true : false; // Return true to sign in the user, false otherwise
      } catch (error) {
        console.error("Error upserting the user:", error);
        return false; // Return false to not sign in the user on error
      }
    },

    // JWT callback: Add user ID from DB to the token
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in (user object is available)
      if (user && trigger === "signIn") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! }, // Use non-null assertion if confident
          select: { id: true }, // Select only the ID
        });
        if (dbUser) {
          token.id = dbUser.id; // Add database ID to the token
        }
      }
      return token;
    },

    // Session callback: Add user ID from token to the session object
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string; // Add ID from token to session.user
      }
      return session;
    },
  },
});
