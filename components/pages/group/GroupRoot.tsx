'use client';

import { Body1 } from "../../Body1";
import { useCreateSubmission, useGetGroup, useGetTodaysPlayers, useJoinGroup } from "../../../react-query/queries";
import { Button, HStack, Input, Stack } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { default as React, useCallback, useEffect, useMemo, useState } from 'react';
import { Leaderboard } from './Leaderboard';
import { ScoringKeyButton } from './ScoringKeyButton';
import { SubmissionModal } from "./SubmissionModal";
import { SubmissionsTable } from './SubmissionsTable';
import { WhoSubmitted } from './WhoSubmitted';

export const GroupRoot = ({ params }) => {
  const { groupId } = params;
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { data: groupData, isLoading: isLoadingGroup } = useGetGroup({ groupId });
  const { data: gamesForDate, isLoading: loadingPlayers } = useGetTodaysPlayers({ date: selectedDate });
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();
  const { mutate: joinGroup } = useJoinGroup();

  const onSubmit = useCallback(({ gameId, playerId }) => {
    createSubmission({ gameId, playerId });
  }, [createSubmission]);

  const currentUserId = sessionData?.user?.id;

  const filteredGamesAndPlayers = useMemo(() => {
    if (!gamesForDate) return [];
    return (
      gamesForDate
        .map((game) => ({
          ...game,
          teams: game.teams
            .map((team) => ({
              ...team,
              players: team.players.filter((player) =>
                player.name.toLowerCase().includes(search.toLowerCase())
              ).map(p => ({
                ...p,
                alreadySubmitted: groupData?.players
                  ?.find(gp => gp.userId === currentUserId)
                  ?.submissions?.some(sub => sub.playerId === p.id) ?? false
              })),
            }))
            .filter((team) => team.players.length > 0),
        }))
        .filter((game) => game.teams.length > 0)
    );
  }, [gamesForDate, search, groupData, currentUserId]);

  useEffect(() => {
    if (submitSuccess) {
      setModalOpen(false);
    }
  }, [submitSuccess]);

  const userInGroup = groupData?.players?.some(player => player.userId === currentUserId);

  if (isLoadingGroup) {
    return <Body1>Loading Group...</Body1>;
  }

  if (!groupData) {
    return <Body1>Group not found or access denied.</Body1>;
  }

  if (!sessionData?.user) {
    router.replace('/api/auth/signin');
    return <Body1>Unauthorized</Body1>;
  }

  return (
    <GroupInterface
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      groupData={groupData}
      groupId={groupId}
      filteredGamesAndPlayers={filteredGamesAndPlayers}
      loadingPlayers={loadingPlayers}
      onSubmit={onSubmit}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      search={search}
      onSearchChange={setSearch}
    />
  );
};

const GroupInterface = ({
  modalOpen,
  setModalOpen,
  groupData,
  groupId,
  filteredGamesAndPlayers,
  loadingPlayers,
  onSubmit,
  selectedDate,
  onDateChange,
  search,
  onSearchChange,
}) => (
  <Stack gap={3}>
    <HStack justifyContent='space-between'>
      <Body1>
        Group: {groupData?.group?.name}
      </Body1>
      <HStack>
        <ScoringKeyButton />
        <WhoSubmitted groupId={groupId} />
      </HStack>
    </HStack>
    <Body1>
      Today's Date: {new Date().toLocaleDateString()}
    </Body1>
    <Button
      isDisabled={!groupData?.players}
      colorScheme="orange"
      onClick={() => setModalOpen(true)}
    >
      Create Submission
    </Button>
    <Leaderboard groupId={groupId} />
    <SubmissionsTable groupId={groupId} />
    <SubmissionModal
      isOpen={modalOpen}
      onClose={setModalOpen}
      filteredPlayersByTeam={filteredGamesAndPlayers}
      loadingPlayers={loadingPlayers}
      onSubmit={onSubmit}
      selectedDate={selectedDate}
      onDateChange={onDateChange}
      search={search}
      onSearchChange={onSearchChange}
    />
  </Stack>
);
