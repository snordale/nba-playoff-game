'use client';

import { useClipboard, useToast } from "@chakra-ui/react";
import { startOfDay as dateFnsStartOfDay, format, isBefore, parseISO } from 'date-fns';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { queryClient, useCreateSubmission, useGenerateInviteLink, useGetGroup } from "../../../react-query/queries";
import { Body1 } from "../../Body1";
import { GroupInterface } from './GroupInterface';
import { GroupMember } from './CalendarDisplay';

interface Player {
  id: string;
  name: string;
  teamName: string;
  teamAbbreviation: string;
  gameId: string;
  gameDate: Date;
}

interface GameWithTeams {
  gameId: string;
  gameDate: Date;
  teams: {
    [teamName: string]: {
      name: string;
      abbreviation: string;
      players: Array<{
        id: string;
        name: string;
        alreadySubmitted: boolean;
      }>;
    };
  };
}

interface PlayerStats {
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
}

type ViewMode = 'calendar' | 'list';

export const GroupRoot = ({ params }) => {
  const { groupId } = params;
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { data: groupData, isLoading: isLoadingGroup } = useGetGroup({ groupId });
  const { mutate: createSubmission, isPending: isSubmitting } = useCreateSubmission();
  const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const toast = useToast();
  const currentUserId = sessionData?.user?.id;
  const currentUserUsername = sessionData?.user?.name;

  const onSubmit = useCallback(async ({ gameId, playerId }) => {
    return new Promise<void>((resolve, reject) => {
      createSubmission({ gameId, playerId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
          setIsDayModalOpen(false);
          resolve();
        },
        onError: (error) => {
          reject(error);
        }
      });
    });
  }, [createSubmission, groupId]);

  const handleDayClick = useCallback((date: Date | string) => {
    const clickedDay = typeof date === 'string' ? parseISO(date) : date;
    const formattedDate = format(clickedDay, 'yyyy-MM-dd');

    const hasGames = groupData?.gameCountsByDate?.[formattedDate] > 0;
    const isPast = isBefore(dateFnsStartOfDay(clickedDay), dateFnsStartOfDay(new Date()));

    if (hasGames || isPast) {
      setSelectedDate(formattedDate);
      setIsDayModalOpen(true);
    } else {
      toast({
        title: "No games scheduled",
        description: "There are no games scheduled for this date.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [groupData?.gameCountsByDate, toast]);

  const allSubmissionsForSelectedDate = useMemo(() => {
    if (!selectedDate || !groupData?.players) return [];
    return groupData.players.map(player => {
      const submission = player.submissions?.find(sub =>
        sub?.date && format(new Date(sub.date), 'yyyy-MM-dd') === selectedDate
      );
      return {
        username: player.username,
        playerName: submission?.playerName || null,
        score: submission?.score || null,
        stats: submission?.stats || null,
      };
    });
  }, [selectedDate, groupData?.players]);

  const currentSubmissionForSelectedDate = useMemo(() => {
    if (!selectedDate || !groupData?.currentUserSubmissionsMap || !groupData?.players) return null;
    const submission = groupData.currentUserSubmissionsMap[selectedDate];
    const fullSub = groupData.players?.find(p => p.userId === currentUserId)?.submissions?.find(s =>
      s?.date && format(new Date(s.date), 'yyyy-MM-dd') === selectedDate
    );
    return submission && fullSub ? { playerName: submission.playerName, playerId: fullSub.playerId } : null;
  }, [selectedDate, groupData?.currentUserSubmissionsMap, groupData?.players, currentUserId]);

  const previouslySubmittedPlayerIds = useMemo(() => {
    if (!groupData?.currentUserSubmissionsMap) return [];
    return Array.from(new Set(Object.entries(groupData.currentUserSubmissionsMap)
      .filter(([dateKey]) => dateKey !== selectedDate)
      .map(([, sub]) => (sub as { playerId?: string })?.playerId)
      .filter(id => id != null)
    ));
  }, [groupData?.currentUserSubmissionsMap, selectedDate]);

  useEffect(() => {
    if (groupData) {
      console.log("Data from useGetGroup:", groupData);
      console.log("Game Counts Received:", groupData.gameCountsByDate);
    }
  }, [groupData]);

  const group = groupData?.group;
  const scoredPlayers = groupData?.players;
  const currentUserSubmissionsMap = groupData?.currentUserSubmissionsMap;
  const gameCountsByDate = groupData?.gameCountsByDate;
  const submissionsByDate = groupData?.submissionsByDate;

  const groupMembers: GroupMember[] = useMemo(() => {
    return scoredPlayers?.map(player => ({ username: player.username })) || [];
  }, [scoredPlayers]);

  const userInGroup = scoredPlayers?.some(p => p.userId === currentUserId);

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
    router.replace('/api/auth/signin');
    return <Body1>Redirecting to login...</Body1>;
  }

  return (
    <GroupInterface
      group={group}
      groupId={groupId}
      onSubmit={onSubmit}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      search={search}
      onSearchChange={setSearch}
      onCalendarDateClick={handleDayClick}
      isDayModalOpen={isDayModalOpen}
      setIsDayModalOpen={setIsDayModalOpen}
      currentUserSubmissionsMap={currentUserSubmissionsMap}
      gameCountsByDate={gameCountsByDate}
      submissionsByDate={submissionsByDate}
      groupMembers={groupMembers}
      viewMode={viewMode}
      setViewMode={setViewMode}
      scoredPlayers={scoredPlayers}
      currentUserId={currentUserId}
      currentUserUsername={currentUserUsername}
      allSubmissionsForSelectedDate={allSubmissionsForSelectedDate}
      currentSubmissionForSelectedDate={currentSubmissionForSelectedDate}
      previouslySubmittedPlayerIds={previouslySubmittedPlayerIds}
    />
  );
};
