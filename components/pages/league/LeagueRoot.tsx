'use client';

import { Body1 } from "@/components/Body1";
import { useCreateSubmission, useGetLeague, useGetTodaysPlayers } from "@/react-query/queries";
import { Avatar, Button, HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Stack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { Leaderboard } from "./Leaderboard";
import { ScoringKeyButton } from "./ScoringKeyButton";
import SubmissionsTable from "./SubmissionsTable";
import WhoSubmitted from "./WhoSubmitted";
import { useSession } from "next-auth/react";

export const LeagueRoot = ({ params }) => {
  const { data } = useSession();
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
  };

  const currentPlayer = leagueData?.players.find(player => player.user.email === data?.user?.email);
  const currentPlayerId = currentPlayer?.id;

  const filteredPlayersByTeam = useMemo(() => {
    if (!teams || !leagueData.players) {
      return [];
    }

    // Map over teams and then players to construct a new structure
    return teams.map(team => ({
      ...team,
      players: team.players.map(player => {
        // Check if the player has already submitted today
        const alreadySubmitted = leagueData.players.some(p =>
          p.id === currentPlayerId &&
          p.submissions.some(submission =>
            submission.playerName === player.name &&
            submission.teamName === team.team
          )
        ) || leagueData.todaysSubmissions.find(submission => submission.player?.user.email === data?.user?.email && submission.playerName === player.name && submission.teamName === team.team);
        return {
          ...player,
          alreadySubmitted: !!alreadySubmitted,
        };
      }).filter(player => player.name.toLowerCase().includes(search.toLowerCase()))
    })).filter(team => team.players.length > 0);
  }, [teams, search, currentPlayerId, leagueData?.players]);

  useEffect(() => {
    if (submitSuccess) {
      setModalOpen(false);
    }
  }, [submitSuccess]);

  const userSubmission = leagueData?.todaysSubmissions.find(submission => submission.player?.user.email === data?.user?.email);

  if (!leagueData) {
    return <Body1>Loading...</Body1>;
  }

  return (
    <Stack>
      <HStack justifyContent='space-between'>
        <Body1>League: {leagueData.league.name}</Body1>
        <HStack>
          <ScoringKeyButton />
          <WhoSubmitted leagueId={leagueId} />
        </HStack>
      </HStack>
      <Body1>Today's Date: {new Date().toLocaleDateString()}</Body1>
      {userSubmission && (
        <Body1 key={userSubmission.id}>
          {userSubmission.playerName} submitted at {new Date(userSubmission.createdAt).toLocaleTimeString()}.
        </Body1>
      )}
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
                  {filteredPlayersByTeam?.map(({ players, team, alreadySubmitted }) => (
                    <>
                      {players?.map((player) => (
                        <Button
                          size='md'
                          colorScheme='purple'
                          flexShrink={0}
                          key={player.image}
                          isDisabled={player.alreadySubmitted}
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