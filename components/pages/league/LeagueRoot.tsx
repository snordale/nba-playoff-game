'use client';

import { Body1 } from "@/components/Body1";
import { useCreateSubmission, useGetLeague, useGetTodaysPlayers } from "@/react-query/queries";
import { Avatar, Button, HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Stack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { Leaderboard } from "./Leaderboard";
import { ScoringKeyButton } from "./ScoringKeyButton";
import SubmissionsTable from "./SubmissionsTable";
import WhoSubmitted from "./WhoSubmitted";

export const LeagueRoot = ({ params }) => {
  const leagueId = params.leagueId;
  // State
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  // Queries
  const { data: leagueData } = useGetLeague({ leagueId });
  const { data: teams } = useGetTodaysPlayers();
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();

  const onModalClose = () => {
    setModalOpen(false);
  }

  const onSubmit = ({ playerName, playerImage, teamName }) => {
    createSubmission({
      leagueId: leagueData.league.id,
      playerName,
      playerImage,
      teamName,
    });
  }

  const filteredPlayers = useMemo(() => {
    if (!teams) {
      return [];
    }

    return teams.map((team) => ({
      ...team,
      players: team.players.filter((player) => player.name.toLowerCase().includes(search.toLowerCase()))
    })).filter(team => team.players.length > 0);
  }, [teams, search]);

  useEffect(() => {
    if (submitSuccess) {
      setModalOpen(false);
    }
  }, [submitSuccess]);

  if (!leagueData) {
    return <Body1>Loading...</Body1>;
  }

  return (
    <Stack>
      <HStack justifyContent='space-between'>
        <Body1>League: {leagueData.league.name}</Body1>
        <HStack>
          <ScoringKeyButton />
          <WhoSubmitted />
        </HStack>
      </HStack>
      <Body1>Today's Date: {new Date().toLocaleDateString()}</Body1>
      <Button colorScheme="purple" onClick={() => setModalOpen(true)}>Create Submission</Button>
      <Leaderboard leagueId={leagueId} />
      <SubmissionsTable leagueId={leagueId} />
      <Modal isOpen={modalOpen} onClose={onModalClose}>
        <ModalOverlay />
        <ModalCloseButton onClick={onModalClose} />
        <ModalContent>
          <ModalHeader>Create Submission</ModalHeader>
          <ModalBody>
            <form>
              <Stack>
                <Input
                  value={search}
                  placeholder="Search"
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Stack position='relative' overflow='scroll' height='300px'>
                  {filteredPlayers?.map(({ players, team }) => (
                    <>
                      {players?.map((player) => (
                        <Button
                          size='md'
                          colorScheme='purple'
                          flexShrink={0}
                          key={player}
                          onClick={() => onSubmit({
                            teamName: team,
                            playerName: player.name,
                            playerImage: player.image
                          })}
                          justifyContent='flex-start'
                          gap={2}
                        >
                          <Avatar src={player.image} size='sm' />
                          {player.name} – {team}
                        </Button>
                      ))}
                    </>
                  ))}
                </Stack>
              </Stack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack >
  );
}