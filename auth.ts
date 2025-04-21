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
      if (!user.email) {
        console.error("SignIn callback: User email is missing.");
        return false;
      }
      try {
        const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { deletedAt: true }
        });
        if (existingUser?.deletedAt) {
            console.log(`SignIn blocked for deleted user: ${user.email}`);
            throw new Error("User deleted, contact support for help"); 
        }
        const userData = await prisma.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            username: user.email,
            image: user.image ?? null,
            deletedAt: null,
          },
          update: {
            image: user.image ?? null,
          },
          select: { id: true } 
        });
        (user as any).dbId = userData.id; // Attach ID for jwt callback
        return true; // Allow sign-in
      } catch (error: any) {
        console.error("Error during signIn callback:", error);
        if (error.message === "User deleted, contact support for help") {
            throw error;
        }
        return false;
      }
    },

    // Reverted JWT callback: Only DB call on initial sign-in
    async jwt({ token, user, trigger, session }) {
        // Remove the check for deleted user on every JWT invocation
        /* 
        if (token?.id) { ... prisma check for deletedAt ... } 
        */

        // Add database ID to token ONLY on initial sign-in
        if (trigger === "signIn" && user) {
            let userIdToAdd = (user as any).dbId; // Prioritize ID attached in signIn
            if (!userIdToAdd) {
                 // Fallback: Query DB only if ID wasn't attached (less efficient)
                 console.warn("JWT callback: dbId missing from user object, performing fallback DB query.")
                 const dbUser = await prisma.user.findUnique({ 
                     where: { email: user.email! }, 
                     select: { id: true, deletedAt: true } // Also check deletedAt here just in case signIn failed?
                    });
                 // Prevent adding ID if user somehow got deleted between signIn start and here
                 if (dbUser && !dbUser.deletedAt) {
                     userIdToAdd = dbUser.id;
                 } else if (dbUser?.deletedAt){
                     console.log(`JWT/signIn fallback: User ${user.email} was deleted.`);
                     // Returning empty token might signal error or force sign-out
                     return {}; 
                 }
            }
            if (userIdToAdd) {
                 token.id = userIdToAdd;
            }
        }
        
        return token;
    },

    // Reverted Session callback: Simple ID passthrough
    async session({ session, token }) {
        // Remove the check for token.error === "UserDeleted"
        /* 
        if (token?.error === "UserDeleted") { ... return modified session ... } 
        */

        // Add ID from token to session.user if valid
        if (token?.id && session.user) {
            session.user.id = token.id as string;
        }
        // Ensure no error field is lingering if it was added previously
        delete (session as any).error;
        return session;
    },
  },
});
