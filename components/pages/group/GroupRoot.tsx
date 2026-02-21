"use client";

import { Center, Container, Spinner, Text } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GroupProvider, useGroup } from "./GroupContext";
import { GroupInterface } from "./GroupInterface";

const GroupContent = () => {
  const { isLoadingGroup, group, userInGroup } = useGroup();
  const { data: sessionData } = useSession();
  const router = useRouter();

  if (isLoadingGroup) {
    return (
      <Center py={16}>
        <Spinner color="orange.500" size="lg" />
      </Center>
    );
  }

  if (!group) {
    return <Center py={16}><Text color="gray.500">Group not found.</Text></Center>;
  }

  if (!userInGroup) {
    return <Center py={16}><Text color="gray.500">Access denied. You are not a member of this group.</Text></Center>;
  }

  if (!sessionData?.user) {
    router.replace('/');
    return <Center py={16}><Text color="gray.500">Redirecting…</Text></Center>;
  }

  return <GroupInterface />;
};

export const GroupRoot = ({
  groupId,
  seasonParam,
}: {
  groupId: string;
  seasonParam?: string;
}) => {
  const parsedSeason = seasonParam ? parseInt(seasonParam, 10) : undefined;
  const season = parsedSeason != null && !isNaN(parsedSeason) ? parsedSeason : undefined;

  return (
    <Container maxW="container.xl" p={{ base: 4, md: 6 }}>
      <GroupProvider groupId={groupId} season={season}>
        <GroupContent />
      </GroupProvider>
    </Container>
  );
};
