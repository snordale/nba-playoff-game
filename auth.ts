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
            select: { id: true, deletedAt: true }
        });

        if (existingUser?.deletedAt) {
            console.log(`SignIn blocked for deleted user: ${user.email}`);
            throw new Error("User deleted, contact support for help"); 
        }

        let finalUserId: string | undefined;

        if (existingUser) {
            // User exists and is not deleted, update image potentially
            console.log(`SignIn: Updating existing user ${user.email}`);
            const updatedUser = await prisma.user.update({
                where: { email: user.email },
                data: { image: user.image ?? null },
                select: { id: true },
            });
            finalUserId = updatedUser.id;
        } else {
            // User does not exist, create them
            console.log(`SignIn: Creating new user ${user.email}`);
            const newUser = await prisma.user.create({
                data: {
                    email: user.email,
                    username: user.email, // Using email as unique username
                    image: user.image ?? null,
                    deletedAt: null,
                },
                select: { id: true },
            });
            finalUserId = newUser.id;
        }

        // Ensure we got an ID
        if (!finalUserId) {
             console.error(`SignIn: Failed to get user ID for ${user.email} after create/update.`);
             return false;
        }

        (user as any).dbId = finalUserId; // Attach ID for jwt callback
        console.log(`SignIn successful for ${user.email}, user ID: ${finalUserId}`);
        return true; // Allow sign-in

      } catch (error: any) {
        // Log the specific error
        console.error(`Error during signIn callback for ${user.email}:`, error);
        // Check for Prisma Unique constraint violation (P2002)
        if (error?.code === 'P2002') {
            console.error("SignIn failed: Prisma Unique constraint violation (likely username).", error.meta);
            // You could potentially retry with a different username here, but returning false is safer initially
             return false;
        }
        // Re-throw the specific deleted user error if needed by NextAuth error pages
        if (error.message === "User deleted, contact support for help") {
            throw error;
        }
        // Deny sign-in for all other errors
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
