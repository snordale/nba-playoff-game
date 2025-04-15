// app/invite/page.tsx
import { auth } from "@/auth"; // Adjust path if needed
import InviteClientPage from "@/components/pages/invite/InviteClientPage"; // We'll create this next
import { prisma } from "@/prisma/client"; // Adjust path if needed
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';

// Define the expected payload structure after verifying the JWT
interface InviteTokenPayload {
  groupId: string;
  iat?: number; // Issued at (standard JWT claim)
  exp?: number; // Expiration time (standard JWT claim)
}

// Define possible return types for handleInvite
type HandleInviteResult =
  | { success: true; redirectPath: string }
  | { error: string; groupName?: string }
  | { needsLogin: true; groupName: string; token: string };


// Define the expected digest code for redirects
// NOTE: No longer needed here as redirect is moved
// const REDIRECT_ERROR_CODE = "NEXT_REDIRECT";

async function handleInvite(token: string, userId: string | undefined): Promise<HandleInviteResult> {
  const jwtSecret = process.env.JWT_INVITE_SECRET;
  if (!jwtSecret) {
    console.error("JWT_INVITE_SECRET missing");
    return { error: "Server configuration error." };
  }

  let payload: InviteTokenPayload;
  try {
    payload = jwt.verify(token, jwtSecret) as InviteTokenPayload;
    if (!payload.groupId) {
      throw new Error("Invalid token payload: missing groupId");
    }
  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    let errorMessage = "Invalid or expired invite link.";
    if (error.name === 'TokenExpiredError') {
      errorMessage = "This invite link has expired.";
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = "This invite link is invalid.";
    }
    return { error: errorMessage };
  }

  const { groupId } = payload;

  let group: { id: string; name: string } | null;
  try {
      group = await prisma.group.findUnique({
          where: { id: groupId },
          select: { id: true, name: true }
      });
  } catch (dbError) {
      console.error("Error fetching group details:", dbError);
      return { error: "Could not retrieve group information." };
  }


  if (!group) {
    return { error: "The invited group no longer exists." };
  }

  // If user is logged in, attempt to add them directly
  if (userId) {
    try {
      const existingMembership = await prisma.groupUser.findFirst({
        where: { userId, groupId },
      });

      if (existingMembership) {
        console.log(`User ${userId} already in group ${groupId}. Preparing redirect.`);
      } else {
        await prisma.groupUser.create({
          data: {
            userId: userId,
            groupId: groupId,
            isAdmin: false,
          },
        });
        console.log(`User ${userId} successfully added to group ${groupId}. Preparing redirect.`);
      }
      // ** Return success instead of redirecting here **
      return { success: true, redirectPath: `/groups/${groupId}` };

    } catch (error: any) {
        // Handle *only database/unexpected* errors here
        console.error(`Error adding user ${userId} to group ${groupId}:`, error);
        return {
            error: "Could not join the group due to an unexpected error.",
            groupName: group.name // Return groupName for context if needed
        };
    }
  } else {
    // User is not logged in
    return { needsLogin: true, groupName: group.name, token };
  }
}


// This Server Component handles the initial logic
export default async function InvitePage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : undefined;

  if (!token) {
    // Render client page with error if no token
    return <InviteClientPage error="No invite token provided." />;
  }

  const session = await auth();
  const userId = session?.user?.id;

  const result = await handleInvite(token, userId);

  // ** Check result and redirect directly if successful **
  if ('success' in result && result.success) {
    redirect(result.redirectPath); // Perform server-side redirect
  }

  // Otherwise, pass the error or needsLogin state explicitly to the Client Component
  // based on the narrowed type of 'result'.
  if ('error' in result) {
      return <InviteClientPage error={result.error} groupName={result.groupName} />;
  } else if ('needsLogin' in result && result.needsLogin) { // Explicitly check for needsLogin
      return <InviteClientPage needsLogin={true} groupName={result.groupName} token={result.token} />;
  } else {
      // Fallback or handle unexpected state if necessary
      console.error("Unexpected result state in InvitePage:", result);
      return <InviteClientPage error="An unexpected error occurred processing the invite." />;
  }
}