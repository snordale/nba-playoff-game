"use client";

import { Body1 } from "@/components/Body1";
import CustomLink from "@/components/CustomLink";
import { Button, HStack, Stack } from "@chakra-ui/react";
import { useState } from "react";
import CreateLeagueModal from "./CreateLeagueModal";

const HomeContent = () => {
  const leagues = [];

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
            colorScheme="purple"
            onClick={() => setModalVariant("create")}
          >
            Create League
          </Button>
          <Button flex={1} onClick={() => setModalVariant("join")}>
            Join League
          </Button>
        </HStack>
        <Body1 fontWeight={600}>Leagues</Body1>
        {leagues.length === 0 && (
          <Body1>No leagues yet. Create a league to get started.</Body1>
        )}
        {leagues.map((league) => (
          <CustomLink key={league.id} href={`/league/${league.id}`}>
            {league.name}
          </CustomLink>
        ))}
      </Stack>
      <CreateLeagueModal variant={modalVariant} onClose={onCreateLeagueClose} />
    </>
  );
};

export default HomeContent;
