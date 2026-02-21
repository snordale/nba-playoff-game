import { prisma } from "../prisma/client";

async function main() {
  // Find all submissions without groupUserId
  const submissions = await prisma.submission.findMany({
    where: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      groupUserId: null as any,
    },
    include: {
      user: true,
    },
  });

  console.log(`Found ${submissions.length} submissions without groupUserId`);

  for (const submission of submissions) {
    // Find the user's group membership
    const groupUser = await prisma.groupUser.findFirst({
      where: {
        userId: submission.userId
      }
    });

    if (!groupUser) {
      console.log(`Could not find group for user ${(submission as any).user?.username}`);
      continue;
    }

    // Update the submission
    await prisma.submission.update({
      where: {
        id: submission.id
      },
      data: {
        groupUserId: groupUser.id
      }
    });

    console.log(`Updated submission ${submission.id} for user ${(submission as any).user?.username}`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 