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

// Define the expected digest code for redirects
const REDIRECT_ERROR_CODE = "NEXT_REDIRECT";

async function handleInvite(token: string, userId: string | undefined) {
  const jwtSecret = process.env.JWT_INVITE_SECRET;
  if (!jwtSecret) {
    console.error("JWT_INVITE_SECRET missing");
    return { error: "Server configuration error." };
  }

  let payload: InviteTokenPayload;
  try {
    // Verify the token and decode payload
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

  // Fetch group details to show the name
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true }
  });

  if (!group) {
    return { error: "The invited group no longer exists." };
  }

  // If user is logged in, attempt to add them directly
  if (userId) {
    try {
      // Check if user is already a member
      const existingMembership = await prisma.groupUser.findFirst({
        where: { userId, groupId },
      });

      if (existingMembership) {
        console.log(`User ${userId} already in group ${groupId}. Redirecting.`);
      } else {
        // Add user to the group
        await prisma.groupUser.create({
          data: {
            userId: userId,
            groupId: groupId,
            isAdmin: false, // Default to non-admin
          },
        });
        console.log(`User ${userId} successfully added to group ${groupId}.`);
      }
      redirect(`/groups/${groupId}`);

    } catch (error: any) {
        // Check if the error is a redirect error by its digest code
        if (error?.digest === REDIRECT_ERROR_CODE) {
            throw error; // Re-throw the redirect error
        }
        // Handle other actual errors
        console.error(`Error adding user ${userId} to group ${groupId}:`, error);
        return { 
            error: "Could not join the group due to an unexpected error. Please try again or contact the group admin.", 
            groupName: group.name, 
            token, 
            needsLogin: true // Still might need login if DB failed transiently
        };
    }
  } else {
    // User is not logged in - prompt them
    return { needsLogin: true, groupName: group.name, token };
  }
}


// This Server Component handles the initial logic
export default async function InvitePage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  // Ensure searchParams exists and token is a string
  const token = typeof searchParams?.token === 'string' ? searchParams.token : undefined;

  if (!token) {
    return <InviteClientPage error="No invite token provided." />;
  }

  const session = await auth();
  const userId = session?.user?.id;

  const result = await handleInvite(token, userId);

  // Pass the result to a Client Component to handle UI (buttons, messages)
  return <InviteClientPage {...result} />;
}