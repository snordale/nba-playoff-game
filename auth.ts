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
        // Check if user exists and if they are deleted *before* upserting
        const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { deletedAt: true }
        });

        // If user exists and is deleted, prevent sign-in
        if (existingUser?.deletedAt) {
            console.log(`SignIn blocked for deleted user: ${user.email}`);
            // Throw a specific error to potentially show a custom message on the front end
            // Note: NextAuth might swallow this error, returning a generic sign-in error.
            // You might need error page customization (/auth/error) to show the specific message.
            throw new Error("User deleted, contact support for help"); 
            // Or return false to prevent sign-in with a generic error:
            // return false;
        }

        // Proceed with upsert only if user is not deleted or doesn't exist yet
        const userData = await prisma.user.upsert({
          where: {
            email: user.email,
          },
          create: {
            email: user.email,
            username: user.email, // Consider prompting for username later
            image: user.image ?? null,
            deletedAt: null, // Explicitly set to null on create
          },
          update: {
            image: user.image ?? null,
            // DO NOT update deletedAt here - deletion should be a separate process
          },
          select: { id: true } // Select ID for JWT
        });

        // Attach the user ID needed for the JWT callback *early*
        // This is a workaround as the `user` object passed to `jwt` might lack the DB ID initially.
        (user as any).dbId = userData.id;

        return true; // Allow sign-in

      } catch (error: any) {
        console.error("Error during signIn callback:", error);
        // If it's our specific deleted user error, re-throw it
        if (error.message === "User deleted, contact support for help") {
            throw error;
        }
        return false; // Deny sign-in for other errors
      }
    },

    // JWT callback: Add user ID from DB to the token
    async jwt({ token, user, trigger, session }) {
        // Check if user exists and is deleted during token refresh/session checks
        if (token?.id) {
            const dbUserCheck = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { deletedAt: true }
            });
            // If user is deleted, invalidate the token/session by returning an empty object or error
            if (dbUserCheck?.deletedAt) {
                console.log(`JWT check: User ${token.id} is deleted. Invalidating token.`);
                return { ...token, error: "UserDeleted" }; // Add error marker
                // Or return {}; // Returning empty object might force sign-out
            }
        }

        // Add database ID to token on initial sign-in
        // Use the ID attached in signIn callback if available
        if (user && (user as any).dbId && trigger === "signIn") {
            token.id = (user as any).dbId;
        } else if (user && trigger === "signIn") {
             // Fallback: Query DB if ID wasn't attached (less efficient)
             const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, select: { id: true } });
             if (dbUser) token.id = dbUser.id;
        }

        return token;
    },

    // Session callback: Add user ID and handle deleted user error
    async session({ session, token }) {
        // If token has the error marker, prevent session creation or modify session
        if (token?.error === "UserDeleted") {
             console.log(`Session check: User ${token.id} is deleted. Blocking session.`);
             // Throwing an error might not work as expected here.
             // Returning a modified session or null might be alternatives depending on desired UX.
             // For now, let's just not add the user ID to signal an invalid session.
             // session.error = "User deleted, contact support for help"; // Add error to session
             // Or return null; // This might break things if session is expected
             return { ...session, user: undefined, error: "User deleted, contact support for help" }; // Clear user, add error
        }

        // Add ID from token to session.user if valid
        if (token?.id && session.user) {
            session.user.id = token.id as string;
        }
        return session;
    },
  },
});
