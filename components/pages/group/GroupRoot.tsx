'use client';

import { Button, HStack, Stack, useClipboard, useToast } from "@chakra-ui/react";
import { format, parseISO, startOfDay as dateFnsStartOfDay, isPast, isToday } from 'date-fns';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { queryClient, useCreateSubmission, useGenerateInviteLink, useGetGroup, useGetTodaysPlayers } from "../../../react-query/queries";
import { Body1 } from "../../Body1";
import { CalendarDisplay } from './CalendarDisplay';
import { Leaderboard } from './Leaderboard';
import { ScoringKeyButton } from './ScoringKeyButton';
import { SubmissionModal } from "./SubmissionModal";
import { WhoSubmitted } from './WhoSubmitted';
import { DailyDetailsModal } from './DailyDetailsModal';

export const GroupRoot = ({ params }) => {
  const { groupId } = params;
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsDate, setDetailsDate] = useState<string | null>(null);
  const { data: groupData, isLoading: isLoadingGroup } = useGetGroup({ groupId });
  const { data: gamesForDate, isLoading: loadingPlayers } = useGetTodaysPlayers({ date: selectedDate });
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();
  const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const toast = useToast();

  const onSubmit = useCallback(({ gameId, playerId }) => {
    createSubmission({ gameId, playerId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
      }
    });
  }, [createSubmission, groupId]);

  const currentUserId = sessionData?.user?.id;

  const currentUserGroupData = useMemo(() => {
    return groupData?.players?.find(p => p.userId === currentUserId);
  }, [groupData, currentUserId]);

  const filteredGamesAndPlayers = useMemo(() => {
    if (!gamesForDate) return [];

    const submittedPlayerIds = new Set(currentUserGroupData?.submissions?.map(sub => sub.playerId) ?? []);

    return (
      gamesForDate
        .map((game) => ({
          ...game,
          teams: game.teams
            .map((team) => ({
              ...team,
              players: team.players
                .filter((player) =>
                  player.name.toLowerCase().includes(search.toLowerCase())
                )
                .map(p => ({
                  ...p,
                  alreadySubmitted: submittedPlayerIds.has(p.id)
                })),
            }))
            .filter((team) => team.players.length > 0),
        }))
        .filter((game) => game.teams.length > 0)
    );
  }, [gamesForDate, search, currentUserGroupData]);

  useEffect(() => {
    if (submitSuccess) {
      setModalOpen(false);
    }
  }, [submitSuccess]);

  const userInGroup = !!currentUserGroupData;

  // Process submissions by date
  const submissionsByDate = useMemo(() => {
    if (!groupData?.players) return {};
    const submissionsMap: { [dateKey: string]: Array<{ username: string; playerName: string; score: number | null }> } = {};
    groupData.players.forEach(player => {
      player.submissions?.forEach(sub => {
        if (!sub.gameDate || !sub.playerName) return;
        const gameDayStart = dateFnsStartOfDay(parseISO(sub.gameDate.toISOString()));
        const dateKey = format(gameDayStart, 'yyyy-MM-dd');
        if (!submissionsMap[dateKey]) {
          submissionsMap[dateKey] = [];
        }
        submissionsMap[dateKey].push({
          username: player.username,
          playerName: sub.playerName,
          score: sub.score,
        });
      });
    });
    Object.keys(submissionsMap).forEach(dateKey => {
      submissionsMap[dateKey].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
    });
    return submissionsMap;
  }, [groupData]);

  // Handler for clicking a day on the calendar
  const handleDayClick = useCallback((date: Date) => {
    console.log("handleDayClick called with date:", date);
    
    const today = dateFnsStartOfDay(new Date());
    const clickedDay = dateFnsStartOfDay(date);
    console.log("Comparison:", { clickedDay, today, isPast: clickedDay < today });

    if (clickedDay < today) { 
      const formattedDate = format(clickedDay, 'yyyy-MM-dd');
      console.log("Opening details modal for:", formattedDate);
      setDetailsDate(formattedDate);
      setDetailsModalOpen(true);
      setModalOpen(false); 
    } else {
      const formattedDate = format(clickedDay, 'yyyy-MM-dd');
      console.log("Opening submission modal for:", formattedDate);
      setSelectedDate(formattedDate); 
      setModalOpen(true); 
      setDetailsModalOpen(false); 
    }
  }, []);

  if (isLoadingGroup) {
    return <Body1>Loading Group...</Body1>;
  }

  if (!groupData?.group) {
    return <Body1>Group not found.</Body1>;
  }

  if (!userInGroup && !isLoadingGroup) {
    return <Body1>Access denied. You are not a member of this group.</Body1>;
  }

  if (!sessionData?.user) {
    router.replace('/api/auth/signin');
    return <Body1>Redirecting to login...</Body1>;
  }

  return (
    <GroupInterface
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      group={groupData.group}
      groupUsers={groupData.players}
      groupId={groupId}
      filteredGamesAndPlayers={filteredGamesAndPlayers}
      loadingPlayers={loadingPlayers}
      onSubmit={onSubmit}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      search={search}
      onSearchChange={setSearch}
      submissionsByDate={submissionsByDate}
      onCalendarDateClick={handleDayClick}
      detailsModalOpen={detailsModalOpen}
      setDetailsModalOpen={setDetailsModalOpen}
      detailsDate={detailsDate}
    />
  );
};

const GroupInterface = ({
  modalOpen,
  setModalOpen,
  group,
  groupUsers,
  groupId,
  filteredGamesAndPlayers,
  loadingPlayers,
  onSubmit,
  selectedDate,
  onDateChange,
  search,
  onSearchChange,
  submissionsByDate,
  onCalendarDateClick,
  detailsModalOpen,
  setDetailsModalOpen,
  detailsDate,
}) => {
  const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const toast = useToast();

  const handleGenerateInvite = () => {
    generateLink({ groupId }, {
      onSuccess: (data) => {
        setValue(data.inviteUrl);
        onCopy();
        toast({
          title: "Invite link copied!",
          description: "Share the link with your friends.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      },
      onError: (error) => {
        toast({
          title: "Error generating link",
          description: error.message || "Could not generate invite link.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    });
  };

  return (
    <Stack gap={3}>
      <HStack justifyContent='space-between'>
        <Body1 >
          {group?.name}
        </Body1>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateInvite}
            isLoading={isGeneratingLink}
            colorScheme="orange"
          >
            {hasCopied ? "Copied!" : "Invite Friends"}
          </Button>
          <ScoringKeyButton />
          <WhoSubmitted groupId={groupId} />
        </HStack>
      </HStack>
      <Body1>
        Today's Date: {new Date().toLocaleDateString()}
      </Body1>
      <Button
        isDisabled={!groupUsers}
        colorScheme="orange"
        onClick={() => setModalOpen(true)}
      >
        Create Submission
      </Button>
      <CalendarDisplay submissionsByDate={submissionsByDate} onDateClick={onCalendarDateClick} />
      <Leaderboard groupId={groupId} />
      <SubmissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        filteredPlayersByTeam={filteredGamesAndPlayers}
        loadingPlayers={loadingPlayers}
        onSubmit={onSubmit}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        search={search}
        onSearchChange={onSearchChange}
      />
      <DailyDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        selectedDate={detailsDate}
        submissions={detailsDate ? submissionsByDate[detailsDate] : undefined}
      />
    </Stack>
  );
};
