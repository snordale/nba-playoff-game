'use client';

import { Body1 } from "@/components/Body1";
import { useCreateSubmission, useGetLeague, useGetTodaysPlayers, useJoinLeague } from "@/react-query/queries";
import { Avatar, Button, HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Stack } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Leaderboard } from './Leaderboard';
import { ScoringKeyButton } from './ScoringKeyButton';
import { SubmissionsTable } from './SubmissionsTable';
import { WhoSubmitted } from './WhoSubmitted';
import { isAfter8PacificUsingUTC } from "@/app/utils";

export const LeagueRoot = ({ params }) => {
  const { leagueId } = params;
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { data: leagueData } = useGetLeague({ leagueId });
  const { data: teams } = useGetTodaysPlayers();
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();
  const { mutate: joinLeague } = useJoinLeague();

  const onModalClose = useCallback(() => setModalOpen(false), []);

  const onSubmit = useCallback(({ playerName, playerImage, teamName }) => {
    createSubmission({ leagueId, playerName, playerImage, teamName });
  }, [createSubmission, leagueId]);

  const currentPlayerId = leagueData?.players?.find(player => player.user.email === sessionData?.user?.email)?.id;

  const filteredPlayersByTeam = useMemo(() => teams?.map(team => ({
    ...team,
    players: team.players.filter(player => player.name.toLowerCase().includes(search.toLowerCase())).map(player => ({
      ...player,
      alreadySubmitted: leagueData?.players?.some(p =>
        p.id === currentPlayerId &&
        p.submissions.some(submission =>
          submission.playerName === player.name && submission.teamName === team.team
        )
      )
    }))
  })).filter(team => team.players.length > 0), [teams, search, currentPlayerId, leagueData?.players]);

  useEffect(() => {
    if (submitSuccess) {
      setModalOpen(false);
    }
  }, [submitSuccess]);

  const onJoinLeague = useCallback(() => {
    joinLeague({ leagueId, password });
  }, [joinLeague, leagueId, password]);

  const userInLeague = leagueData?.players?.some(player => player.user.email === sessionData?.user?.email);

  if (!leagueData) {
    return <Body1>Loading...</Body1>;
  }

  if (!sessionData?.user) {
    router.replace('/api/auth/signin');
    return <Body1>Unauthorized</Body1>;
  }

  if (!userInLeague) {
    return (
      <JoinLeagueSection password={password} onPasswordChange={setPassword} onJoinLeague={onJoinLeague} leagueName={leagueData?.league?.name} />
    );
  }

  return (
    <LeagueInterface modalOpen={modalOpen} setModalOpen={setModalOpen} leagueData={leagueData} leagueId={leagueId} filteredPlayersByTeam={filteredPlayersByTeam} onSubmit={onSubmit} search={search} onSearchChange={setSearch} />
  );
};

const JoinLeagueSection = ({ password, onPasswordChange, onJoinLeague, leagueName }) => (
  <Stack>
    <Body1 fontWeight={600}>{leagueName}</Body1>
    <Body1>Enter the password to join this league.</Body1>
    <Input value={password} onChange={e => onPasswordChange(e.target.value)} placeholder="Password" />
    <Button colorScheme='purple' onClick={onJoinLeague}>Join League</Button>
  </Stack>
);


const LeagueInterface = ({ modalOpen, setModalOpen, leagueData, leagueId, filteredPlayersByTeam, onSubmit, search, onSearchChange }) => (
  <Stack gap={3}>
    <HStack justifyContent='space-between'>
      <Body1>League: {leagueData?.league?.name}</Body1>
      <HStack>
        <ScoringKeyButton />
        <WhoSubmitted leagueId={leagueId} />
      </HStack>
    </HStack>
    <Body1>Today's Date: {new Date().toLocaleDateString()}</Body1>
    <Button
      isDisabled={!leagueData?.players || isAfter8PacificUsingUTC()}
      colorScheme="purple"
      onClick={() => setModalOpen(true)}
    >
      {isAfter8PacificUsingUTC() ? 'Submisssion Locked' : 'Create Submission'}
    </Button>
    <Leaderboard leagueId={leagueId} />
    <SubmissionsTable leagueId={leagueId} />
    <SubmissionModal isOpen={modalOpen} onClose={setModalOpen} filteredPlayersByTeam={filteredPlayersByTeam} onSubmit={onSubmit} search={search} onSearchChange={onSearchChange} />
  </Stack>
);

const SubmissionModal = ({ isOpen, onClose, filteredPlayersByTeam, onSubmit, search, onSearchChange }) => (
  <Modal isOpen={isOpen} onClose={() => onClose(false)}>
    <ModalOverlay />
    <ModalCloseButton onClick={() => onClose(false)} />
    <ModalContent>
      <ModalHeader>Create Submission</ModalHeader>
      <ModalBody>
        <form>
          <Stack>
            <Input
              value={search}
              placeholder="Search"
              onChange={e => onSearchChange(e.target.value)}
            />
            <Stack position='relative' overflow='scroll' height='300px'>
              {filteredPlayersByTeam?.map(({ players, team }) => (
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
);
