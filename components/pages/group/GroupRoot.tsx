'use client';

import { Container } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Body1 } from "../../Body1";
import { GroupProvider, useGroup } from './GroupContext';
import { GroupInterface } from './GroupInterface';

const GroupContent = () => {
  const { isLoadingGroup, group, userInGroup } = useGroup();
  const { data: sessionData } = useSession();
  const router = useRouter();

  if (isLoadingGroup) {
    return <Body1>Loading Group...</Body1>;
  }

  if (!group) {
    return <Body1>Group not found.</Body1>;
  }

  if (!userInGroup && !isLoadingGroup) {
    return <Body1>Access denied. You are not a member of this group.</Body1>;
  }

  if (!sessionData?.user) {
    router.replace('/');
    return <Body1>Redirecting to homepage...</Body1>;
  }

  return <GroupInterface />;
};

export const GroupRoot = ({ groupId }: { groupId: string }) => {

  return (
    <Container maxW="container.xl" p={{ base: 4, md: 6 }}>
      <GroupProvider groupId={groupId}>
        <GroupContent />
      </GroupProvider>
    </Container>
  );
};
