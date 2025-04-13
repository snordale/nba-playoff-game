"use client";

import { Body1 } from "@/components/Body1";
import CustomLink from "@/components/CustomLink";
import { Button, HStack, Stack } from "@chakra-ui/react";
import { useState } from "react";
import CreateLeagueModal from "./CreateLeagueModal";
import { useGetGroups } from "@/react-query/queries";

const HomeContent = () => {
  const { data: groups } = useGetGroups();

  const [modalVariant, setModalVariant] = useState("");

  const onCreateLeagueClose = () => {
    setModalVariant("");
  };

  return (
    <>
      <Stack>
        <HStack>
          <Button
            flex={1}
            colorScheme="orange"
            onClick={() => setModalVariant("create")}
          >
            Create League
          </Button>
        </HStack>
        <Body1 fontWeight={600}>Groups</Body1>
        {groups?.length === 0 && (
          <Body1>No groups yet. Create a group to get started.</Body1>
        )}
        {groups?.map((group) => (
          <CustomLink key={group.id} href={`/group/${group.id}`}>
            {group.name}
          </CustomLink>
        ))}
      </Stack>
      <CreateLeagueModal variant={modalVariant} onClose={onCreateLeagueClose} />
    </>
  );
};

export default HomeContent;
