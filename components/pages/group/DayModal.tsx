import { useGetGames, useGetPlayers } from '@/react-query/queries'; // Assuming useGetTodaysPlayers exists
import { CheckCircleIcon } from '@chakra-ui/icons';
import { Badge, Box, Button, Divider, Grid, HStack, Heading, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, Stack, Text, VStack, useToast } from '@chakra-ui/react'; // Added Badge, Divider, Heading
import { format, isBefore, parseISO, startOfDay } from 'date-fns'; // Added isBefore, startOfDay
import { useMemo, useState } from 'react'; // Added useMemo

// Define PlayerStats interface (if not already defined/imported)
interface PlayerStats {
    points: number | null;
    rebounds: number | null;
    assists: number | null;
    steals: number | null;
    blocks: number | null;
    turnovers: number | null;
}

// Define structure for submission data passed in props
interface SubmissionDetailForModal {
    username: string;
    playerName: string | null; // Can be null if no pick yet
    score: number | null;
    stats: PlayerStats | null;
}

// Define structure for player data needed for selection
interface PlayerForSelection {
    id: string;
    name: string;
    alreadySubmitted: boolean; // Has the current user already picked this player on a *previous* day?
}

// Define structure for team data needed for selection
interface TeamForSelection {
    teamId: string;
    name: string;
    abbreviation: string;
    players: PlayerForSelection[];
}

// Define structure for game data needed for selection
interface GameForSelection {
    gameId: string;
    gameDate: Date;
    teams: TeamForSelection[];
}

// Updated Props Interface
interface DayModalProps {
    isOpen: boolean;
    onClose: (refresh?: boolean) => void; // Allow forcing refresh on close after submission
    selectedDate: string; // YYYY-MM-DD format
    allSubmissionsForDate: SubmissionDetailForModal[] | undefined; // All user picks for this date
    loadingSubmissions: boolean; // Indicate if submission data is loading
    onSubmit: (submissionData: { gameId: string; playerId: string }) => Promise<void>; // Keep the submission function
    search: string;
    onSearchChange: (value: string) => void;
    currentSubmissionForUser: { playerId: string; playerName: string; } | undefined | null; // Current user's pick specifically for this date
    previouslySubmittedPlayerIds: string[] | undefined; // All player IDs picked by current user on OTHER days
    currentUserId: string; // ID of the logged-in user
    currentUserUsername: string; // Pass username for highlighting
}

export const DayModal = ({
    isOpen,
    onClose,
    selectedDate,
    allSubmissionsForDate,
    loadingSubmissions,
    onSubmit,
    search,
    onSearchChange,
    currentSubmissionForUser,
    previouslySubmittedPlayerIds,
    currentUserId,
    currentUserUsername, // Destructure username
}: DayModalProps) => {
    const displayDate = selectedDate ? format(parseISO(selectedDate), 'MMMM d, yyyy') : 'Selected Date';
    const { data: games, isLoading: loadingGames } = useGetGames({ date: selectedDate });
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Determine if the date is in the past (or today but games started/finished)
    const today = startOfDay(new Date());
    const selectedDay = startOfDay(parseISO(selectedDate));
    const isLocked = isBefore(selectedDay, today);
    // TODO: Enhance isLocked logic based on game status if needed

    // Fetch players available for selection ONLY if the date is not locked
    const { data: playersForSelectionData, isLoading: loadingPlayers } = useGetPlayers({
        date: !isLocked ? selectedDate : null,
    });

    // Memoize processing players for selection list
    const filteredPlayersByTeam = useMemo(() => {
        if (isLocked || !playersForSelectionData) return [];

        // Process playersForSelectionData (assuming it's similar to the old playersForDate structure)
        // Group by game, then team, filtering by search
        const playersByGame = (playersForSelectionData as any[]) // Cast as any or define proper type
            .filter(player => player.name.toLowerCase().includes(search.toLowerCase()))
            .reduce<Record<string, GameForSelection>>((acc, player) => {
                if (!acc[player.gameId]) {
                    acc[player.gameId] = {
                        gameId: player.gameId,
                        gameDate: player.gameDate, // Keep gameDate if needed for display
                        teams: []
                    };
                }
                let teamObj = acc[player.gameId].teams.find(t => t.teamId === player.currentTeamId); // Use currentTeamId or similar
                if (!teamObj) {
                    teamObj = {
                        teamId: player.currentTeamId,
                        name: player.teamName, // Assuming teamName exists
                        abbreviation: player.teamAbbreviation, // Assuming abbreviation exists
                        players: []
                    };
                    acc[player.gameId].teams.push(teamObj);
                }

                teamObj.players.push({
                    id: player.id,
                    name: player.name,
                    // 'alreadySubmitted' here means "used on a previous day"
                    alreadySubmitted: previouslySubmittedPlayerIds?.includes(player.id) ?? false
                });

                return acc;
            }, {});

        return Object.values(playersByGame);
    }, [playersForSelectionData, search, previouslySubmittedPlayerIds, isLocked]);


    function getStatusColor(status: string) {
        // ... (keep existing function)
        if (status === 'STATUS_SCHEDULED') return 'green.600';
        if (status === 'STATUS_IN_PROGRESS') return 'orange.500';
        if (status === 'STATUS_FINAL') return 'red.500';
        return 'gray.500'; // Default
    }

    const handleSubmit = async (submissionData: { gameId: string; playerId: string }) => {
        setIsSubmitting(true);
        try {
            await onSubmit(submissionData); // Call the passed onSubmit

            // Find player name for toast (consider getting this from onSubmit's return if possible)
            let playerName = 'Player';
            filteredPlayersByTeam?.forEach(game => {
                game.teams?.forEach(team => {
                    const player = team.players?.find(p => p.id === submissionData.playerId);
                    if (player) playerName = player.name;
                });
            });

            toast({
                title: 'Submission Successful',
                description: `You picked ${playerName}.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onClose(true); // Close modal and indicate refresh needed
        } catch (error: any) {
            console.error("Submission failed:", error);
            toast({
                title: 'Submission Failed',
                description: error?.message || 'Could not submit your pick. The game might have started, or an error occurred.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Sort submissions for display (e.g., by score desc for past, maybe alpha by user for future)
    const sortedSubmissions = useMemo(() => {
        if (!allSubmissionsForDate) return [];
        if (isLocked) {
            // Sort by score descending for past dates
            return [...allSubmissionsForDate].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
        } else {
            // Sort alphabetically by username for future/current dates
            return [...allSubmissionsForDate].sort((a, b) => a.username.localeCompare(b.username));
        }
    }, [allSubmissionsForDate, isLocked]);

    // Find team abbreviation for the current user's pick for display below search bar
    let currentPickTeamAbbreviation = '';
    if (!isLocked && currentSubmissionForUser && filteredPlayersByTeam) {
        for (const game of filteredPlayersByTeam) {
            for (const team of game.teams ?? []) {
                const player = team.players?.find(p => p.id === currentSubmissionForUser.playerId || p.name === currentSubmissionForUser.playerName);
                if (player) {
                    currentPickTeamAbbreviation = team.abbreviation;
                    break;
                }
            }
            if (currentPickTeamAbbreviation) break;
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(false)} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{displayDate}</ModalHeader>
                <ModalCloseButton onClick={() => onClose(false)} />
                <ModalBody pb={6}>
                    <Stack gap={4}>
                        {/* Games Section (Same as before) */}
                        <Stack gap={2}>
                            <Heading size="sm" color="gray.700">Games</Heading>
                            {loadingGames ? (
                                <HStack py={2} justifyContent='center'><Spinner color="orange.500" size="sm" /></HStack>
                            ) : games && games.length > 0 ? (
                                <Grid gap={2} gridTemplateColumns={['1fr 1fr', '1fr 1fr 1fr', '1fr 1fr 1fr 1fr']}>
                                    {games.map((game) => (
                                        <Box key={game.id} p={1} borderWidth="1px" borderRadius="md">
                                            <HStack justify="space-between" alignItems='flex-start'>
                                                <VStack alignItems='flex-start'>
                                                    <Text fontSize="2xs" color="gray.600">{game.homeTeam.abbreviation} {game.homeScore !== null ? `- ${game.homeScore}` : ''}</Text>
                                                    <Text fontSize="2xs" color="gray.600">{game.awayTeam.abbreviation} {game.awayScore !== null ? `- ${game.awayScore}` : ''}</Text>
                                                </VStack>
                                                <VStack alignItems='flex-end' spacing={0}>
                                                    <Text fontSize="2xs" color={getStatusColor(game.status)}>
                                                        {format(parseISO(game.date), 'h:mm a')} {/* Ensure date is parsed */}
                                                    </Text>
                                                    <Text fontSize="2xs" color={getStatusColor(game.status)}>
                                                        {game.status.replace('STATUS_', '').replace('_', ' ')}
                                                    </Text>
                                                </VStack>
                                            </HStack>
                                        </Box>
                                    ))}
                                </Grid>
                            ) : (
                                <Text color="gray.500">No games scheduled.</Text>
                            )}
                        </Stack>

                        <Divider />

                        {/* Submissions Display Section */}
                        <Stack spacing={3}>
                            <Heading size="sm" color="gray.700">Player Picks</Heading>
                            {loadingSubmissions ? (
                                <HStack py={2} justifyContent='center'><Spinner color="orange.500" size="sm" /></HStack>
                            ) : sortedSubmissions.length === 0 ? (
                                <Text color="gray.500">No submissions yet for this day.</Text>
                            ) : (
                                <Stack spacing={3} maxH="250px" overflowY="auto" pr={2}>
                                    {sortedSubmissions.map((sub, index) => (
                                        <Box
                                            key={sub.username + index} // Consider a more stable key
                                            p={3}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            // Highlight top score if locked, highlight current user if not locked
                                            bg={isLocked ? (index === 0 ? 'orange.50' : 'transparent') : (sub.username === currentUserUsername ? 'blue.50' : 'transparent')}
                                            borderColor={isLocked ? (index === 0 ? 'orange.200' : 'gray.200') : (sub.username === currentUserUsername ? 'blue.200' : 'gray.200')}
                                        >
                                            <HStack justify="space-between" align="flex-start">
                                                <VStack align="start" spacing={1} flex={1} mr={2}>
                                                    <Text fontWeight="bold">{isLocked ? `${index + 1}. ` : ''}{sub.username}</Text>
                                                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                                        {sub.playerName ?? (isLocked ? 'No Pick' : <Text as="span" color="gray.400">No Pick Yet</Text>)}
                                                    </Text>
                                                    {/* Display Stats if available (only for locked dates) */}
                                                    {isLocked && sub.stats && (
                                                        <HStack gap={2} pt={1} width="100%">
                                                            <Text fontSize="xs" color="gray.600">PTS: {sub.stats.points ?? '-'}</Text>
                                                            <Text fontSize="xs" color="gray.600">REB: {sub.stats.rebounds ?? '-'}</Text>
                                                            <Text fontSize="xs" color="gray.600">AST: {sub.stats.assists ?? '-'}</Text>
                                                            <Text fontSize="xs" color="gray.600">STL: {sub.stats.steals ?? '-'}</Text>
                                                            <Text fontSize="xs" color="gray.600">BLK: {sub.stats.blocks ?? '-'}</Text>
                                                            <Text fontSize="xs" color="gray.600">TO: {sub.stats.turnovers ?? '-'}</Text>
                                                        </HStack>
                                                    )}
                                                </VStack>
                                                {/* Score Badge / Status Badge */}
                                                {isLocked ? (
                                                    <Badge
                                                        fontSize="md"
                                                        colorScheme={sub.score === null && sub.playerName ? 'gray' : 'orange'}
                                                        px={3} py={1} borderRadius="full"
                                                        visibility={sub.playerName ? 'visible' : 'hidden'}
                                                    >
                                                        {sub.score ?? 'N/A'} pts
                                                    </Badge>
                                                ) : (
                                                    sub.playerName ?
                                                        <Badge colorScheme='green' variant='subtle'>Pick In</Badge> :
                                                        <Badge colorScheme='gray' variant='subtle'>No Pick</Badge>
                                                )}
                                            </HStack>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Stack>

                        {/* Conditional Submission Section */}
                        {!isLocked && (
                            <>
                                <Divider />
                                <Stack gap={2}>
                                    <Heading size="sm" color="gray.700">Make Your Pick</Heading>
                                    <Input
                                        value={search}
                                        placeholder="Search players..."
                                        onChange={e => onSearchChange(e.target.value)}
                                    />
                                    {/* Display current user's pick for the day */}
                                    {currentSubmissionForUser && (
                                        <Text
                                            fontSize="sm"
                                            fontWeight="semibold" color="orange.600" textAlign="center" p={2} borderWidth={1} borderRadius="md" borderColor="orange.600"
                                        >
                                            Current Pick: {currentSubmissionForUser.playerName} {currentPickTeamAbbreviation ? `– ${currentPickTeamAbbreviation}` : ''}
                                        </Text>
                                    )}
                                </Stack>
                                <Stack
                                    position='relative'
                                    overflowY='auto'
                                    maxH='300px' // Adjust height as needed
                                    borderWidth={1}
                                    borderColor="gray.200"
                                    borderRadius="md"
                                    p={2}
                                >
                                    {loadingPlayers ? (
                                        <HStack py={8} justifyContent='center'><Spinner color="orange.500" /></HStack>
                                    ) : (
                                        <>
                                            {filteredPlayersByTeam && filteredPlayersByTeam.length > 0 ? (
                                                filteredPlayersByTeam.map((game) => (
                                                    <Stack key={game.gameId} pl={2} mb={2} spacing={1}>
                                                        {/* Optional: Display game header if needed */}
                                                        <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                                                            {game.teams?.[0]?.name ?? 'Team A'} vs {game.teams?.[1]?.name ?? 'Team B'}
                                                            &nbsp;({new Date(game.gameDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                                                        </Text>
                                                        {game.teams?.map((team) => (
                                                            <Stack key={team.teamId} pl={2} spacing={0.5}>
                                                                {team.players?.map((player) => {
                                                                    const isCurrentPick = currentSubmissionForUser?.playerId === player.id;
                                                                    // 'previouslySubmitted' means used on *another* day
                                                                    const isPreviouslySubmitted = previouslySubmittedPlayerIds?.includes(player.id) && !isCurrentPick;

                                                                    return (
                                                                        <Button
                                                                            size='sm'
                                                                            variant={isCurrentPick ? 'solid' : 'ghost'}
                                                                            colorScheme='orange'
                                                                            flexShrink={0}
                                                                            key={player.id}
                                                                            // Disable if used on another day OR if submitting
                                                                            isDisabled={isPreviouslySubmitted || isSubmitting}
                                                                            // Show loading specific to this button if it's the one being submitted
                                                                            isLoading={isSubmitting && currentSubmissionForUser?.playerId === player.id}
                                                                            onClick={() => handleSubmit({ gameId: game.gameId, playerId: player.id })}
                                                                            justifyContent='space-between'
                                                                            gap={2}
                                                                            fontWeight="normal"
                                                                            _disabled={{
                                                                                opacity: isPreviouslySubmitted ? 0.5 : 1,
                                                                                cursor: isPreviouslySubmitted ? 'not-allowed' : 'default',
                                                                                textDecoration: isPreviouslySubmitted ? 'line-through' : 'none'
                                                                            }}
                                                                        >
                                                                            <Text>{player.name} – {team.abbreviation}</Text>
                                                                            <HStack spacing={2}>
                                                                                {isPreviouslySubmitted &&
                                                                                    <Text as="span" fontSize="xs" color="gray.500">(Used)</Text>
                                                                                }
                                                                                {isCurrentPick && (
                                                                                    <CheckCircleIcon color="white" boxSize={4} />
                                                                                )}
                                                                            </HStack>
                                                                        </Button>
                                                                    );
                                                                })}
                                                            </Stack>
                                                        ))}
                                                    </Stack>
                                                ))
                                            ) : (
                                                <Text textAlign="center" color="gray.500" p={4}>
                                                    No players found or available for this date/search.
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </>
                        )}
                    </Stack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}; 