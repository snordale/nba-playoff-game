'use client';

import { Button, ButtonGroup, Card, CardBody, HStack, IconButton, Stack, Text, useClipboard, useToast, VStack } from "@chakra-ui/react";
import { format, parseISO, startOfDay as dateFnsStartOfDay, isBefore, isAfter, eachDayOfInterval } from 'date-fns';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { queryClient, useCreateSubmission, useGenerateInviteLink, useGetGroup, useGetTodaysPlayers } from "../../../react-query/queries";
import { Body1 } from "../../Body1";
import { CalendarDisplay } from './CalendarDisplay';
import { Leaderboard } from './Leaderboard';
import { ScoringKeyButton } from './ScoringKeyButton';
import { SubmissionModal } from "./SubmissionModal";
import { DailyDetailsModal } from './DailyDetailsModal';
import { HamburgerIcon, CalendarIcon, ViewIcon } from '@chakra-ui/icons';
import { PLAYOFF_START_DATE, PLAYOFF_END_DATE } from '@/constants';

type ViewMode = 'calendar' | 'list';

const DailySubmissionCard = ({ date, submission, hasGames, onClick }) => {
  const formattedDate = format(parseISO(date), 'MMM d, yyyy');
  const isToday = new Date(date).toDateString() === new Date().toDateString();
  
  return (
    <Card 
      variant="outline" 
      w="full"
      cursor="pointer"
      onClick={() => onClick(date)}
      borderColor={isToday ? "orange.500" : undefined}
      _hover={{
        borderColor: "orange.300",
        transform: "translateY(-1px)",
        transition: "all 0.2s ease-in-out"
      }}
    >
      <CardBody>
        <VStack align="start" spacing={2}>
          <HStack justify="space-between" width="100%">
            <Text fontWeight={isToday ? "bold" : "semibold"} color={isToday ? "orange.500" : undefined}>
              {formattedDate}
              {isToday && " (Today)"}
            </Text>
            {hasGames && !submission && (
              <Text fontSize="sm" color="orange.500" fontWeight="medium">
                Pick needed
              </Text>
            )}
          </HStack>
          {hasGames ? (
            submission ? (
              <VStack align="start" spacing={1}>
                <Text>Pick: {submission.playerName}</Text>
                {submission.score !== null ? (
                  <Text>Score: {submission.score}</Text>
                ) : (
                  <Text color="gray.500">Game not started</Text>
                )}
              </VStack>
            ) : (
              <Text color="gray.500">No pick made</Text>
            )
          ) : (
            <Text color="gray.500">No games</Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export const GroupRoot = ({ params }) => {
  const { groupId } = params;
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsDate, setDetailsDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const { data: groupData, isLoading: isLoadingGroup } = useGetGroup({ groupId });
  const { data: gamesForDate, isLoading: loadingPlayers } = useGetTodaysPlayers({ date: selectedDate });
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();
  const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const toast = useToast();

  // Log received data
  useEffect(() => {
    if(groupData) {
      console.log("Data from useGetGroup:", groupData);
      console.log("Game Counts Received:", groupData.gameCountsByDate);
    }
  }, [groupData]);

  const onSubmit = useCallback(({ gameId, playerId }) => {
    createSubmission({ gameId, playerId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
      }
    });
  }, [createSubmission, groupId]);

  const currentUserId = sessionData?.user?.id;

  const group = groupData?.group;
  const scoredPlayers = groupData?.players;
  const currentUserSubmissionsMap = groupData?.currentUserSubmissionsMap;
  const gameCountsByDate = groupData?.gameCountsByDate;

  const filteredGamesAndPlayers = useMemo(() => {
    if (!gamesForDate) return [];
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
                .map(p => ({ ...p, alreadySubmitted: false }))
            }))
            .filter((team) => team.players.length > 0),
        }))
        .filter((game) => game.teams.length > 0)
    );
  }, [gamesForDate, search]);

  useEffect(() => {
    if (submitSuccess) {
      setModalOpen(false);
    }
  }, [submitSuccess]);

  const userInGroup = scoredPlayers?.some(p => p.userId === currentUserId);

  // Handler for clicking a day on the calendar
  const handleDayClick = useCallback((date: Date) => {
    const today = dateFnsStartOfDay(new Date());
    const clickedDay = dateFnsStartOfDay(date);

    if (clickedDay < today) { 
      const formattedDate = format(clickedDay, 'yyyy-MM-dd');
      setDetailsDate(formattedDate);
      setDetailsModalOpen(true);
      setModalOpen(false); 
    } else {
      const formattedDate = format(clickedDay, 'yyyy-MM-dd');
      setSelectedDate(formattedDate); 
      setModalOpen(true); 
      setDetailsModalOpen(false); 
    }
  }, []);

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
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      group={group}
      groupId={groupId}
      filteredGamesAndPlayers={filteredGamesAndPlayers}
      loadingPlayers={loadingPlayers}
      onSubmit={onSubmit}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      search={search}
      onSearchChange={setSearch}
      onCalendarDateClick={handleDayClick}
      detailsModalOpen={detailsModalOpen}
      setDetailsModalOpen={setDetailsModalOpen}
      detailsDate={detailsDate}
      setDetailsDate={setDetailsDate}
      currentUserSubmissionsMap={currentUserSubmissionsMap}
      gameCountsByDate={gameCountsByDate}
      viewMode={viewMode}
      setViewMode={setViewMode}
    />
  );
};

const GroupInterface = ({
  modalOpen,
  setModalOpen,
  group,
  groupId,
  filteredGamesAndPlayers,
  loadingPlayers,
  onSubmit,
  selectedDate,
  setSelectedDate,
  search,
  onSearchChange,
  onCalendarDateClick,
  detailsModalOpen,
  setDetailsModalOpen,
  detailsDate,
  setDetailsDate,
  currentUserSubmissionsMap,
  gameCountsByDate,
  viewMode,
  setViewMode,
}) => {
  const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const toast = useToast();
  const todayRef = useRef(null);

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

  // Convert submissions map to sorted array for list view
  const sortedDates = useMemo(() => {
    const startDate = parseISO(PLAYOFF_START_DATE);
    const endDate = parseISO(PLAYOFF_END_DATE);
    
    // Get all dates in the playoff range
    return eachDayOfInterval({ start: startDate, end: endDate })
      .map(date => format(date, 'yyyy-MM-dd'))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, []);

  // Scroll to today when switching to list view
  useEffect(() => {
    if (viewMode === 'list' && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [viewMode]);

  const handleCardClick = (date) => {
    const today = dateFnsStartOfDay(new Date());
    const clickedDay = dateFnsStartOfDay(new Date(date));

    if (isBefore(clickedDay, today)) {
      setDetailsDate(date);
      setDetailsModalOpen(true);
    } else {
      setSelectedDate(date);
      setModalOpen(true);
    }
  };

  return (
    <Stack gap={3}>
      <HStack justifyContent='space-between'>
        <Body1 fontWeight="semibold" fontSize="2xl">
          {group?.name}
        </Body1>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateInvite}
          isLoading={isGeneratingLink}
          colorScheme="orange"
        >
          {hasCopied ? "Copied!" : "Copy Invite Link"}
        </Button>
      </HStack>
      <Leaderboard groupId={groupId} />
      
      <HStack justify="flex-end">
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            onClick={() => setViewMode('calendar')}
            colorScheme="orange"
            variant={viewMode === 'calendar' ? 'solid' : 'outline'}
            leftIcon={<CalendarIcon />}
          >
            Calendar
          </Button>
          <Button
            onClick={() => setViewMode('list')}
            colorScheme="orange"
            variant={viewMode === 'list' ? 'solid' : 'outline'}
            leftIcon={<HamburgerIcon />}
          >
            List
          </Button>
        </ButtonGroup>
      </HStack>

      {viewMode === 'calendar' ? (
        <CalendarDisplay
          onDateClick={onCalendarDateClick}
          currentUserSubmissionsMap={currentUserSubmissionsMap}
          gameCountsByDate={gameCountsByDate}
        />
      ) : (
        <VStack 
          spacing={3} 
          align="stretch" 
          maxH="600px" 
          overflowY="auto" 
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
              background: 'rgba(0,0,0,0.1)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '24px',
            },
          }}
          px={1}
        >
          {sortedDates.map(date => {
            const isToday = new Date(date).toDateString() === new Date().toDateString();
            return (
              <div key={date} ref={isToday ? todayRef : null}>
                <DailySubmissionCard
                  date={date}
                  submission={currentUserSubmissionsMap?.[date]}
                  hasGames={gameCountsByDate?.[date] > 0}
                  onClick={handleCardClick}
                />
              </div>
            );
          })}
        </VStack>
      )}

      <SubmissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        filteredPlayersByTeam={filteredGamesAndPlayers}
        loadingPlayers={loadingPlayers}
        onSubmit={onSubmit}
        selectedDate={selectedDate}
        search={search}
        onSearchChange={onSearchChange}
      />
      <DailyDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        selectedDate={detailsDate}
        submissions={detailsDate && currentUserSubmissionsMap?.[detailsDate] ? [currentUserSubmissionsMap[detailsDate]] : []}
      />
    </Stack>
  );
};
