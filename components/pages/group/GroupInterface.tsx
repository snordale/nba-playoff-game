// components/pages/group/GroupInterface.tsx
import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from '@/constants';
import { CalendarIcon, HamburgerIcon } from '@chakra-ui/icons';
import { Button, ButtonGroup, HStack, Stack, useClipboard, useToast, VStack } from "@chakra-ui/react";
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import React, { useEffect, useMemo, useRef } from 'react';
import { queryClient, useGenerateInviteLink } from "../../../react-query/queries"; // Assuming queryClient is exported or accessible
import { Body1 } from "../../Body1";
import { CalendarDisplay } from './CalendarDisplay';
import { DailySubmissionCard } from './DailySubmissionCard';
import { DayModal } from "./DayModal";
import { Leaderboard } from './Leaderboard';

// Define necessary interfaces reused or passed down
interface PlayerStats {
    points: number | null;
    rebounds: number | null;
    assists: number | null;
    steals: number | null;
    blocks: number | null;
    turnovers: number | null;
}

interface Submission {
    date: string; // Assuming date is string 'yyyy-MM-dd'
    playerName: string | null;
    score: number | null;
    stats: PlayerStats | null;
    playerId?: string; // Optional player ID needed for some calculations
    gameStatus?: string; 
    gameDate?: string | Date; // Expecting ISO string or Date object from API
}

interface ScoredPlayer {
    userId: string;
    username: string;
    score: number;
    submissions: Submission[];
    // Add other fields if needed, e.g., isAdmin
}

interface Group {
    id: string;
    name: string;
    // Add other group fields if needed
}

interface CurrentUserSubmission {
    playerName: string;
    score: number | null;
    isFuture: boolean;
    playerId?: string; // Include playerId if available/needed
}

interface CurrentUserSubmissionsMap {
    [dateKey: string]: CurrentUserSubmission;
}

interface GameCountsByDateMap {
    [dateKey: string]: number;
}

// Props for GroupInterface
interface GroupInterfaceProps {
    group: Group | undefined;
    groupId: string;
    onSubmit: (data: { gameId: string; playerId: string }) => Promise<void>;
    selectedDate: string;
    setSelectedDate: (date: string) => void; // Keep if DayModal needs to change date
    search: string;
    onSearchChange: (value: string) => void;
    onCalendarDateClick: (date: Date | string) => void;
    isDayModalOpen: boolean;
    setIsDayModalOpen: (isOpen: boolean) => void;
    currentUserSubmissionsMap: CurrentUserSubmissionsMap | undefined;
    gameCountsByDate: GameCountsByDateMap | undefined;
    submissionsByDate: { [dateKey: string]: { username: string; playerName: string | null; score: number | null; }[] } | undefined; // Keep for CalendarDisplay
    viewMode: 'calendar' | 'list';
    setViewMode: (mode: 'calendar' | 'list') => void;
    scoredPlayers: ScoredPlayer[] | undefined;
    currentUserId: string | undefined;
    currentUserUsername: string | undefined;
    allSubmissionsForSelectedDate: { username: string; playerName: string | null; score: number | null; stats: PlayerStats | null; }[];
    currentSubmissionForSelectedDate: { playerName: string; playerId: string | undefined; } | null | undefined;
    previouslySubmittedPlayerIds: string[];
}

export const GroupInterface: React.FC<GroupInterfaceProps> = ({
    group,
    groupId,
    onSubmit,
    selectedDate,
    setSelectedDate,
    search,
    onSearchChange,
    onCalendarDateClick,
    isDayModalOpen,
    setIsDayModalOpen,
    currentUserSubmissionsMap,
    gameCountsByDate,
    submissionsByDate,
    viewMode,
    setViewMode,
    scoredPlayers,
    currentUserId,
    currentUserUsername,
    allSubmissionsForSelectedDate,
    currentSubmissionForSelectedDate,
    previouslySubmittedPlayerIds
}) => {
    const { mutate: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
    const { onCopy, setValue, hasCopied } = useClipboard("");
    const toast = useToast();
    const todayRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
            onError: (error: any) => { // Add type annotation for error
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

    const sortedDates = useMemo(() => {
        const startDate = parseISO(PLAYOFF_START_DATE);
        const endDate = parseISO(PLAYOFF_END_DATE);
        // Ensure date-fns functions handle potential invalid dates gracefully if needed
        try {
            return eachDayOfInterval({ start: startDate, end: endDate })
                .map(date => format(date, 'yyyy-MM-dd'))
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        } catch (e) {
            console.error("Error calculating date interval:", e);
            return []; // Return empty array on error
        }
    }, []);

    useEffect(() => {
        if (viewMode === 'list' && todayRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const element = todayRef.current;

            // Calculate the position to scroll to center the element
            // offsetTop is relative to the offsetParent, which might not be the scroll container.
            // We need the element's position relative to the container.
            const elementTopRelativeToContainer = element.offsetTop - container.offsetTop;
            const containerHeight = container.clientHeight;
            const elementHeight = element.offsetHeight;
            
            // Calculate the scroll position to center the element
            const scrollTo = elementTopRelativeToContainer - (containerHeight / 2) + (elementHeight / 2);

            // Use smooth scrolling if possible
            container.scrollTo({
                top: scrollTo,
                behavior: 'smooth'
            });
            
            // Fallback or alternative: direct scroll
            // container.scrollTop = scrollTo; 
        }
    }, [viewMode]);

    // handleCardClick calls the handler passed from the parent
    const handleCardClick = (date: string) => {
        onCalendarDateClick(date);
    };

    return (
        <Stack gap={8}>
            {/* Header */}
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

            {/* Leaderboard */}
            <Leaderboard groupId={groupId} />

            {/* View Area */}
            <VStack alignItems='stretch'>
                {/* View Switcher */}
                <HStack>
                    <ButtonGroup size="sm" isAttached variant="outline">
                        <Button
                            onClick={() => setViewMode('list')}
                            colorScheme="orange"
                            variant={viewMode === 'list' ? 'solid' : 'outline'}
                            leftIcon={<HamburgerIcon />}
                            // zIndex={1}
                        >
                            List
                        </Button>
                        <Button
                            onClick={() => setViewMode('calendar')}
                            colorScheme="orange"
                            variant={viewMode === 'calendar' ? 'solid' : 'outline'}
                            leftIcon={<CalendarIcon />}
                        >
                            Calendar
                        </Button>
                    </ButtonGroup>
                </HStack>

                {/* Conditional View: Calendar or List */}
                {viewMode === 'calendar' ? (
                    <CalendarDisplay
                        onDateClick={onCalendarDateClick}
                        currentUserSubmissionsMap={currentUserSubmissionsMap}
                        gameCountsByDate={gameCountsByDate}
                        submissionsByDate={submissionsByDate}
                    />
                ) : (
                    <VStack
                        ref={scrollContainerRef}
                        spacing={3}
                        align="stretch"
                        maxH="600px"
                        overflowY="auto"
                        css={{
                            '&::-webkit-scrollbar': { width: '4px' },
                            '&::-webkit-scrollbar-track': { width: '6px', background: 'rgba(0,0,0,0.1)' },
                            '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.2)', borderRadius: '24px' },
                        }}
                        px={1}
                        borderTopWidth={1}
                        borderColor="gray.100"
                        pt={4}
                    >
                        {sortedDates.map(date => {
                            const isToday = new Date(date).toDateString() === new Date().toDateString();
                            const playersWithSubmissionsForDate = scoredPlayers?.map(player => {
                                const submission = player.submissions?.find(sub =>
                                    format(new Date(sub.date), 'yyyy-MM-dd') === date
                                );
                                return {
                                    userId: player.userId,
                                    username: player.username,
                                    submission: submission ? { 
                                        playerName: submission.playerName ?? 'Error',
                                        score: submission.score,
                                        stats: submission.stats,
                                        gameStatus: submission.gameStatus,
                                        gameDate: submission.gameDate
                                    } : null
                                };
                            }) || [];

                            return (
                                <div key={date} ref={isToday ? todayRef : null}>
                                    <DailySubmissionCard
                                        date={date}
                                        hasGames={(gameCountsByDate?.[date] ?? 0) > 0}
                                        onClick={handleCardClick}
                                        players={playersWithSubmissionsForDate}
                                        currentUserId={currentUserId}
                                    />
                                </div>
                            );
                        })}
                    </VStack>
                )}
            </VStack>

            {/* Modal */}
            {selectedDate && currentUserId && currentUserUsername && ( // Ensure necessary props exist before rendering modal
                <DayModal
                    isOpen={isDayModalOpen}
                    onClose={(refresh) => {
                        setIsDayModalOpen(false);
                        if (refresh) {
                            queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
                        }
                    }}
                    selectedDate={selectedDate}
                    allSubmissionsForDate={allSubmissionsForSelectedDate}
                    loadingSubmissions={false} // Pass actual loading state if available
                    onSubmit={onSubmit}
                    search={search}
                    onSearchChange={onSearchChange}
                    currentSubmissionForUser={currentSubmissionForSelectedDate}
                    previouslySubmittedPlayerIds={previouslySubmittedPlayerIds}
                    currentUserId={currentUserId}
                    currentUserUsername={currentUserUsername}
                />
            )}
        </Stack>
    );
};