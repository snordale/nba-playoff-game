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
    gameStatus?: string;
    gameDate?: string | Date;
}

// Define structure for player data needed for selection
interface PlayerForSelection {
    id: string;
    name: string;
    alreadySubmitted: boolean; // Has the current user already picked this player on a *previous* day?
    gameId: string; // **** ADDED gameId ****
}

// Define structure for team data needed for selection
interface TeamForSelection {
    teamId: string;
    name: string;
    abbreviation: string;
    players: PlayerForSelection[];
    // Optional: Add game time/details if needed and available from player data
    // gameDate?: Date; 
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
    const now = new Date(); // Get current time for comparisons
    const isLocked = isBefore(startOfDay(parseISO(selectedDate)), startOfDay(new Date())); // Day locked check

    // Fetch players available for selection ONLY if the date is not locked
    const { data: playersForSelectionData, isLoading: loadingPlayers } = useGetPlayers({
        date: !isLocked ? selectedDate : null,
    });

    // Memoize processing players for selection list
    const filteredPlayersByTeam = useMemo(() => {
        if (isLocked || !playersForSelectionData) return [];

        // Process playersForSelectionData, group by TEAM
        const playersByTeam = (playersForSelectionData as any[]) // Cast or use proper type from API
            .filter(player => player.name.toLowerCase().includes(search.toLowerCase()))
            .reduce<Record<string, TeamForSelection>>((acc, player) => {
                // **** Use a fallback for missing teamId ****
                const teamId = player.currentTeamId ?? 'UNKNOWN_TEAM'; 
                const teamName = player.teamName ?? 'Unknown Team';
                const teamAbbreviation = player.teamAbbreviation ?? 'UNK';

                if (!acc[teamId]) {
                    acc[teamId] = {
                        teamId: teamId,
                        name: teamName,
                        abbreviation: teamAbbreviation,
                        players: []
                    };
                }

                if (!player.gameId) {
                    // Decide how to handle: skip player? assign default gameId?
                    // Skipping for now:
                     return acc; 
                }

                acc[teamId].players.push({
                    id: player.id,
                    name: player.name,
                    alreadySubmitted: previouslySubmittedPlayerIds?.includes(player.id) ?? false,
                    gameId: player.gameId 
                });

                acc[teamId].players.sort((a, b) => a.name.localeCompare(b.name));

                return acc;
            }, {});
            
        return Object.values(playersByTeam).sort((a, b) => a.name.localeCompare(b.name));

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
            await onSubmit(submissionData);

            let playerName = 'Player';
            // Find player name in the new team-based structure
            for (const team of filteredPlayersByTeam) {
                const player = team.players.find(p => p.id === submissionData.playerId);
                if (player) {
                    playerName = player.name;
                    break;
                }
            }

            toast({
                title: 'Submission Successful',
                description: `You picked ${playerName}.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onClose(true);
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
        for (const team of filteredPlayersByTeam) { // Loop through teams directly
            const player = team.players?.find(p => p.id === currentSubmissionForUser.playerId || p.name === currentSubmissionForUser.playerName);
            if (player) {
                currentPickTeamAbbreviation = team.abbreviation;
                break; // Found the player, stop searching teams
            }
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(false)} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader borderBottomWidth={1} borderColor="orange.600">{displayDate}</ModalHeader>
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
                                                <VStack alignItems='flex-start' gap={0}>
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
                                    {sortedSubmissions.map((sub, index) => {
                                        // Determine if this specific pick is locked
                                        const gameDate = sub?.gameDate ? new Date(sub.gameDate) : null;
                                        const isPickLocked = sub?.gameStatus !== 'STATUS_SCHEDULED' || (gameDate && gameDate <= now);
                                        const canShowPick = isPickLocked || sub.username === currentUserUsername; // Show if locked or it's your pick

                                        return (
                                            <Box
                                                key={sub.username + index} 
                                                p={3}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                bg={isLocked ? (index === 0 ? 'orange.50' : 'transparent') : (sub.username === currentUserUsername ? 'blue.50' : 'transparent')}
                                                borderColor={isLocked ? (index === 0 ? 'orange.200' : 'gray.200') : (sub.username === currentUserUsername ? 'blue.200' : 'gray.200')}
                                            >
                                                <HStack justify="space-between" align="flex-start">
                                                    <VStack align="start" spacing={1} flex={1} mr={2}>
                                                        <Text fontWeight="bold">{isLocked ? `${index + 1}. ` : ''}{sub.username}</Text>
                                                        {/* Conditional Player Name */}
                                                        <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                                            {canShowPick ? (sub.playerName ?? 'No Pick') : (sub.playerName ? "Pick Hidden" : "No Pick Yet")}
                                                        </Text>
                                                        {/* Conditional Stats Grid */}
                                                        {canShowPick && sub.stats && (
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
                                                    {/* Score Badge / Status Badge - Conditionally Visible */}
                                                    {isLocked ? (
                                                        <Badge
                                                            fontSize="md"
                                                            colorScheme={sub.score === null && sub.playerName ? 'gray' : 'orange'}
                                                            px={3} py={1} borderRadius="full"
                                                            // Show badge only if pick is shown and player name exists
                                                            visibility={canShowPick && sub.playerName ? 'visible' : 'hidden'}
                                                        >
                                                            {sub.score ?? 'N/A'} pts
                                                        </Badge>
                                                    ) : (
                                                        // Show status based on whether a pick exists, not if it's revealed
                                                        sub.playerName ?
                                                            <Badge colorScheme='green' variant='subtle'>Pick In</Badge> :
                                                            <Badge colorScheme='gray' variant='subtle'>No Pick</Badge>
                                                    )}
                                                </HStack>
                                            </Box>
                                        );
                                    })}
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
                                    {/* Optional: Display current pick below search */}
                                    {currentSubmissionForUser && (
                                        <Text
                                            fontSize="sm"
                                            fontWeight="semibold" color="orange.600" textAlign="center" p={1} borderWidth={1} borderRadius="md" borderColor="orange.200" bg="orange.50">
                                            Current Pick: {currentSubmissionForUser.playerName} {currentPickTeamAbbreviation ? `(${currentPickTeamAbbreviation})` : ''}
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
                                            {/* **** UPDATED Player List Rendering **** */}
                                            {filteredPlayersByTeam && filteredPlayersByTeam.length > 0 ? (
                                                // **** Loop through teams ****
                                                filteredPlayersByTeam.map((team) => (
                                                    <Stack key={team.teamId} pl={2} mb={2} spacing={1}>
                                                        {/* **** Display Team Header **** */}
                                                        <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                                                            {team.name}
                                                            {/* Optional: Add game time/opponent if available on team */}
                                                            {/* e.g., team.gameDate ? ` (${new Date(team.gameDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})` : '' */}
                                                        </Text>
                                                        {/* **** Player list directly under team **** */}
                                                        <Stack pl={2} spacing={0.5}>
                                                            {team.players?.map((player) => {
                                                                const isCurrentPick = currentSubmissionForUser?.playerId === player.id;
                                                                const isPreviouslySubmitted = previouslySubmittedPlayerIds?.includes(player.id) && !isCurrentPick;

                                                                return (
                                                                    <Button
                                                                        size='sm'
                                                                        variant={isCurrentPick ? 'solid' : 'ghost'}
                                                                        colorScheme='orange'
                                                                        flexShrink={0}
                                                                        key={player.id}
                                                                        // Disable if used on another day OR if submitting OR if missing gameId
                                                                        isDisabled={!player.gameId || isPreviouslySubmitted || isSubmitting}
                                                                        // Show loading specific to this button if it's the one being submitted
                                                                        isLoading={isSubmitting && currentSubmissionForUser?.playerId === player.id}
                                                                        // **** Use player.gameId ****
                                                                        onClick={() => player.gameId && handleSubmit({ gameId: player.gameId, playerId: player.id })}
                                                                        justifyContent='space-between'
                                                                        gap={2}
                                                                        fontWeight="normal"
                                                                        _disabled={{
                                                                            opacity: isPreviouslySubmitted || !player.gameId ? 0.5 : 1,
                                                                            cursor: isPreviouslySubmitted || !player.gameId ? 'not-allowed' : 'default',
                                                                            textDecoration: isPreviouslySubmitted ? 'line-through' : 'none'
                                                                        }}
                                                                    >
                                                                        <Text>{player.name} – {team.abbreviation}</Text>
                                                                        <HStack spacing={2}>
                                                                            {isPreviouslySubmitted &&
                                                                                <Text as="span" fontSize="xs" color="gray.500">(Used)</Text>
                                                                            }
                                                                            {isCurrentPick && (
                                                                                <CheckCircleIcon color={isCurrentPick ? 'white' : 'orange.500'} boxSize={4} />
                                                                            )}
                                                                        </HStack>
                                                                    </Button>
                                                                );
                                                            })}
                                                        </Stack>
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