'use client';

import { Body1 } from "@/components/Body1";
import { useCreateSubmission, useGetLeague, useGetTodaysPlayers } from "@/react-query/queries";
import { Avatar, Button, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Stack } from "@chakra-ui/react";
import { useMemo, useState } from "react";

export const LeagueRoot = ({ params }) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { data: league } = useGetLeague({ leagueId: params.leagueId });
  const { data: teams } = useGetTodaysPlayers();
  const { mutate: createSubmission } = useCreateSubmission();

  const onModalClose = () => {
    setModalOpen(false);
  }

  const onSubmit = ({ playerName, playerImage, teamName }) => {
    createSubmission({
      leagueId: league.id,
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


  if (!league) {
    return <Body1>Loading...</Body1>;
  }


  return (
    <Stack>
      <Body1>{league.name}</Body1>
      <Body1>Created: {new Date(league.createdAt).toLocaleDateString()}</Body1>
      <Body1>Today's Date: {new Date().toLocaleDateString()}</Body1>
      <Button colorScheme="purple" onClick={() => setModalOpen(true)}>Create Submission</Button>
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
    </Stack>
  );
}