'use client';

import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from '@/constants';
import { CalendarIcon, HamburgerIcon } from '@chakra-ui/icons';
import { Badge, Button, ButtonGroup, Card, CardBody, HStack, Stack, Text, useClipboard, useToast, VStack, Grid } from "@chakra-ui/react";
import { startOfDay as dateFnsStartOfDay, eachDayOfInterval, format, isBefore, parseISO } from 'date-fns';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { queryClient, useCreateSubmission, useGenerateInviteLink, useGetGames, useGetGroup, useGetTodaysPlayers } from "../../../react-query/queries";
import { Body1 } from "../../Body1";
import { CalendarDisplay } from './CalendarDisplay';
import { DailyDetailsModal } from './DailyDetailsModal';
import { Leaderboard } from './Leaderboard';
import { SubmissionModal } from "./SubmissionModal";

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

const DailySubmissionCard = ({ date, hasGames, onClick, players }) => {
  const formattedDate = format(parseISO(date), 'MMM d, yyyy');
  const isToday = new Date(date).toDateString() === new Date().toDateString();
  const today = dateFnsStartOfDay(new Date());
  const cardDate = dateFnsStartOfDay(new Date(date));
  const isLocked = isBefore(cardDate, today);

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
        <VStack align="start" spacing={2} width="100%">
          <HStack justify="space-between" width="100%">
            <Text fontWeight={isToday ? "bold" : "semibold"} color={isToday ? "orange.500" : undefined}>
              {formattedDate}
              {isToday && " (Today)"}
            </Text>
            {hasGames && (
              <Text fontSize="sm" color={isLocked ? "gray.600" : "orange.500"} fontWeight="medium">
                {isLocked ? "Final" : "Open"}
              </Text>
            )}
          </HStack>
          {hasGames ? (
            <VStack align="stretch" width="100%" spacing={1}>
              {players.map((player) => (
                <VStack key={player.userId} align="stretch" borderTopWidth={1} borderColor="gray.100" pt={2} mt={1}>
                  <HStack justify="space-between" width="100%">
                    <Text fontSize="sm" fontWeight="medium">{player.username}</Text>
                    {isLocked ? (
                      player.submission ? (
                        <Badge colorScheme={player.submission.score !== null ? "orange" : "gray"}>
                          {player.submission.score !== null ? `${player.submission.score} pts` : 'N/A'}
                        </Badge>
                      ) : (
                        <Text fontSize="sm" color="red.500">No pick</Text>
                      )
                    ) : (
                      <Text fontSize="sm" color={player.submission ? "green.500" : "orange.500"}>
                        {player.submission ? "Pick made" : "No pick"}
                      </Text>
                    )}
                  </HStack>
                  {player.submission && (
                    <Text fontSize="sm" color="gray.700" pl={2}>{player.submission.playerName}</Text>
                  )}
                </VStack>
              ))}
            </VStack>
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
  const { data: gamesForDate, isLoading: loadingGames } = useGetGames({ date: selectedDate });
  const { data: playersForDate, isLoading: loadingPlayers } = useGetTodaysPlayers({ date: selectedDate });
  const { data: detailsGames, isLoading: loadingDetailsGames } = useGetGames({ date: detailsDate || '' });
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();
  const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const toast = useToast();

  // Log received data
  useEffect(() => {
    if (groupData) {
      console.log("Data from useGetGroup:", groupData);
      console.log("Game Counts Received:", groupData.gameCountsByDate);
    }
  }, [groupData]);

  const onSubmit = useCallback(({ gameId, playerId }) => {
    createSubmission({ gameId, playerId }, {
      onSuccess: () => {
        // Invalidate both group and games queries to refresh all data
        queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
        queryClient.invalidateQueries({ queryKey: ["getGames"] });

        // Close the modal
        setModalOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Error submitting pick",
          description: error.message || "Could not submit your pick. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    });
  }, [createSubmission, groupId, toast, setModalOpen]);

  const currentUserId = sessionData?.user?.id;

  const group = groupData?.group;
  const scoredPlayers = groupData?.players;
  const currentUserSubmissionsMap = groupData?.currentUserSubmissionsMap;
  const gameCountsByDate = groupData?.gameCountsByDate;

  const filteredGamesAndPlayers = useMemo(() => {
    if (!playersForDate) return [];

    // Group players by game
    const playersByGame = (playersForDate as Player[])
      .filter(player => player.name.toLowerCase().includes(search.toLowerCase()))
      .reduce<Record<string, GameWithTeams>>((acc, player) => {
        if (!acc[player.gameId]) {
          acc[player.gameId] = {
            gameId: player.gameId,
            gameDate: player.gameDate,
            teams: {}
          };
        }

        // Group players by team within each game
        if (!acc[player.gameId].teams[player.teamName]) {
          acc[player.gameId].teams[player.teamName] = {
            name: player.teamName,
            abbreviation: player.teamAbbreviation,
            players: []
          };
        }

        // Check if this player has already been submitted for this date
        const dateKey = format(new Date(player.gameDate), 'yyyy-MM-dd');
        const submission = currentUserSubmissionsMap?.[dateKey];
        const isSubmitted = submission?.playerName === player.name;

        acc[player.gameId].teams[player.teamName].players.push({
          id: player.id,
          name: player.name,
          alreadySubmitted: isSubmitted
        });

        return acc;
      }, {});

    // Convert to array format expected by SubmissionModal
    return Object.values(playersByGame).map(game => ({
      gameId: game.gameId,
      gameDate: game.gameDate,
      teams: Object.values(game.teams)
    }));
  }, [playersForDate, search, currentUserSubmissionsMap]);

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
    const formattedDate = format(clickedDay, 'yyyy-MM-dd');

    if (clickedDay < today) {
      setDetailsDate(formattedDate);
      setDetailsModalOpen(true);
      setModalOpen(false);
    } else {
      // Only open the submission modal if there are games on this date
      const hasGames = gameCountsByDate?.[formattedDate] > 0;
      if (hasGames) {
        setSelectedDate(formattedDate);
        setModalOpen(true);
        setDetailsModalOpen(false);
      } else {
        toast({
          title: "No games scheduled",
          description: "There are no games scheduled for this date.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  }, [gameCountsByDate, toast]);

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
      scoredPlayers={scoredPlayers}
      currentUserId={currentUserId}
      detailsGames={detailsGames?.map(game => ({
        homeTeam: game.homeTeam.name,
        awayTeam: game.awayTeam.name,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        gameTime: format(parseISO(game.date), 'h:mm a')
      }))}
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
  scoredPlayers,
  currentUserId,
  detailsGames,
}) => {
  const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const toast = useToast();
  const todayRef = useRef(null);

  // Extract all player IDs ever submitted by the current user
  const previouslySubmittedPlayerIds = useMemo(() => {
    if (!currentUserSubmissionsMap) return [];
    // Get unique player IDs from all submissions in the map
    // Assume sub has { playerId: string }
    return Array.from(new Set(Object.values(currentUserSubmissionsMap)
      .map(sub => (sub as { playerId: string })?.playerId) // Use playerId
      .filter(id => id != null) // Filter out potential null/undefined IDs
    ));
  }, [currentUserSubmissionsMap]);

  // Convert submissions to the format needed by CalendarDisplay
  const submissionsByDate = useMemo(() => {
    const submissionMap: { [dateKey: string]: { username: string; playerName: string; score: number | null; }[] } = {};
    
    // Iterate through each date in the gameCountsByDate
    Object.keys(gameCountsByDate || {}).forEach(dateKey => {
      submissionMap[dateKey] = [];
      
      // Add submissions for each player on this date
      scoredPlayers?.forEach(player => {
        // Find submission for this specific date
        const submission = player.submissions?.find(sub => 
          format(new Date(sub.date), 'yyyy-MM-dd') === dateKey
        );
        
        if (submission) {
          submissionMap[dateKey].push({
            username: player.username,
            playerName: submission?.playerName,
            score: submission.score
          });
        }
      });
    });
    
    return submissionMap;
  }, [scoredPlayers, gameCountsByDate]);

  // Log submissions data for debugging
  useEffect(() => {
    console.log('Current submissions map:', submissionsByDate);
    console.log('Scored players:', scoredPlayers);
  }, [submissionsByDate, scoredPlayers]);

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
    <Stack gap={8}>
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
      <VStack alignItems='stretch'>
        <HStack>
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
            submissionsByDate={submissionsByDate}
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
              
              // Update mapping to include stats
              const playersWithSubmissionsForDate = scoredPlayers?.map(player => {
                const submission = player.submissions?.find(sub =>
                  format(new Date(sub.date), 'yyyy-MM-dd') === date
                );
                return {
                  userId: player.userId,
                  username: player.username,
                  submission: submission ? {
                    playerName: submission?.playerName,
                    score: submission.score,
                    stats: submission.stats // Include stats here
                  } : null
                };
              }) || [];

              return (
                <div key={date} ref={isToday ? todayRef : null}>
                  <DailySubmissionCard
                    date={date}
                    hasGames={gameCountsByDate?.[date] > 0}
                    onClick={handleCardClick}
                    players={playersWithSubmissionsForDate} // Pass data with stats
                  />
                </div>
              );
            })}
          </VStack>
        )}
      </VStack>

      <SubmissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        filteredPlayersByTeam={filteredGamesAndPlayers}
        loadingPlayers={loadingPlayers}
        onSubmit={onSubmit}
        selectedDate={selectedDate}
        search={search}
        onSearchChange={onSearchChange}
        currentSubmission={currentUserSubmissionsMap?.[selectedDate]}
        previouslySubmittedPlayerIds={previouslySubmittedPlayerIds}
      />
      <DailyDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        selectedDate={detailsDate}
        submissions={detailsDate && scoredPlayers ? scoredPlayers.map(player => {
          // Find the specific submission for the detailsDate
          const submission = player.submissions?.find(sub => 
            format(new Date(sub.date), 'yyyy-MM-dd') === detailsDate
          );
          // Return the structure expected by DailyDetailsModal, now including stats
          return {
            username: player.username,
            playerName: submission?.playerName || 'No pick',
            score: submission?.score || null, // score is likely points
            stats: submission?.stats || null // Pass the stats object
          };
        }) : []}
        games={detailsGames}
      />
    </Stack>
  );
};
