'use client';

import { Body1 } from "@/components/Body1";
import { useCreateSubmission, useGetLeague, useGetTodaysPlayers, useJoinLeague } from "@/react-query/queries";
import { Button, HStack, Input, Stack } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Leaderboard } from './Leaderboard';
import { ScoringKeyButton } from './ScoringKeyButton';
import { SubmissionModal } from "./SubmissionModal";
import { SubmissionsTable } from './SubmissionsTable';
import { WhoSubmitted } from './WhoSubmitted';

export const LeagueRoot = ({ params }) => {
  const { leagueId } = params;
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [password, setPassword] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { data: leagueData } = useGetLeague({ leagueId });
  const { data: teams, isLoading: loadingPlayers } = useGetTodaysPlayers({ date: selectedDate });
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();
  const { mutate: joinLeague } = useJoinLeague();

  const onSubmit = useCallback(({ playerName, playerImage, teamName }) => {
    createSubmission({ leagueId, playerName, playerImage, teamName, date: selectedDate });
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

  console.log('leagueData.league.name')
  console.log(leagueData)

  if (!userInLeague) {
    return (
      <JoinLeagueSection
        password={password}
        onPasswordChange={setPassword}
        onJoinLeague={onJoinLeague}
        leagueName={leagueData?.league?.name}
      />
    );
  }

  return (
    <LeagueInterface
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      leagueData={leagueData}
      leagueId={leagueId}
      futureSubmissions={leagueData?.futureSubmissions}
      filteredPlayersByTeam={filteredPlayersByTeam}
      loadingPlayers={loadingPlayers}
      onSubmit={onSubmit}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      search={search}
      onSearchChange={setSearch}
    />
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

const LeagueInterface = ({
  modalOpen,
  setModalOpen,
  leagueData,
  leagueId,
  filteredPlayersByTeam,
  futureSubmissions,
  loadingPlayers,
  onSubmit,
  selectedDate,
  onDateChange,
  search,
  onSearchChange
}) => (
  <Stack gap={3}>
    <HStack justifyContent='space-between'>
      <Body1>
        League: {leagueData?.league?.name}
      </Body1>
      <HStack>
        <ScoringKeyButton />
        <WhoSubmitted leagueId={leagueId} />
      </HStack>
    </HStack>
    <Body1>
      Today's Date: {new Date().toLocaleDateString()}
    </Body1>
    <Button
      isDisabled={!leagueData?.players}
      colorScheme="purple"
      onClick={() => setModalOpen(true)}
    >
      Create Submission
    </Button>
    <Leaderboard leagueId={leagueId} />
    <SubmissionsTable leagueId={leagueId} />
    <SubmissionModal
      isOpen={modalOpen}
      onClose={setModalOpen}
      filteredPlayersByTeam={filteredPlayersByTeam}
      futureSubmissions={futureSubmissions}
      loadingPlayers={loadingPlayers}
      onSubmit={onSubmit}
      selectedDate={selectedDate}
      onDateChange={onDateChange}
      search={search}
      onSearchChange={onSearchChange}
    />
  </Stack>
);
