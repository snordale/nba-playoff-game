import { useGetGames, useGetPlayers } from '@/react-query/queries';
import { type SubmissionView } from '@/utils/submission-utils';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { Badge, Box, Button, Divider, Grid, HStack, Heading, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, Stack, Text, VStack, useToast } from '@chakra-ui/react';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';

interface DayModalProps {
    isOpen: boolean;
    onClose: (refresh?: boolean) => void;
    selectedDate: string; // YYYY-MM-DD format
    loadingSubmissions: boolean;
    onSubmit: (submissionData: { gameId: string; playerId: string }) => Promise<void>;
    search: string;
    onSearchChange: (value: string) => void;
    currentSubmissionForUser: { playerName: string; playerId: string; } | undefined | null;
    previouslySubmittedPlayerIds: string[];
    currentUserUsername: string;
    usersWithSubmissionsForDate: {
        userId: string;
        username: string;
        submission: SubmissionView | null;
    }[];
}

// Define structure for player data needed for selection
interface PlayerForSelection {
    id: string;
    name: string;
    alreadySubmitted: boolean;
    gameId: string;
}

// Define structure for team data needed for selection
interface TeamForSelection {
    teamId: string;
    name: string;
    abbreviation: string;
    players: PlayerForSelection[];
}

export const DayModal = ({
    isOpen,
    onClose,
    selectedDate,
    loadingSubmissions,
    onSubmit,
    search,
    onSearchChange,
    currentSubmissionForUser,
    previouslySubmittedPlayerIds,
    currentUserUsername,
    usersWithSubmissionsForDate,
}: DayModalProps) => {
    const { data: sessionData } = useSession();
    const currentUserId = sessionData?.user?.id;
    const displayDate = selectedDate ? format(parseISO(selectedDate), 'MMMM d, yyyy') : 'Selected Date';
    const { data: games, isLoading: loadingGames } = useGetGames({ date: selectedDate });
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const now = new Date();
    const isLocked = isBefore(startOfDay(parseISO(selectedDate)), startOfDay(new Date()));

    // Fetch players available for selection ONLY if the date is not locked
    const { data: playersForSelectionData, isLoading: loadingPlayers } = useGetPlayers({
        date: !isLocked ? selectedDate : null,
    });

    // Memoize processing players for selection list
    const filteredPlayersByTeam = useMemo(() => {
        if (isLocked || !playersForSelectionData) return [];

        // Process playersForSelectionData, group by TEAM
        const playersByTeam = (playersForSelectionData as any[])
            .filter(player => player.name.toLowerCase().includes(search.toLowerCase()))
            .reduce<Record<string, TeamForSelection>>((acc, player) => {
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
            const errorMessage = error?.response?.data?.error || error.message || 'Could not submit your pick. The game might have started, or an error occurred.';
            toast({
                title: 'Submission Failed',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Sort submissions for display
    const sortedSubmissions = useMemo(() => {
        if (!usersWithSubmissionsForDate) return [];
        if (isLocked) {
            // Sort by score descending for past dates
            return [...usersWithSubmissionsForDate].sort((a, b) => ((b.submission?.score ?? -Infinity) - (a.submission?.score ?? -Infinity)));
        } else {
            // Sort alphabetically by username for future/current dates
            return [...usersWithSubmissionsForDate].sort((a, b) => a.username.localeCompare(b.username));
        }
    }, [usersWithSubmissionsForDate, isLocked]);

    // Find team abbreviation for the current user's pick
    let currentPickTeamAbbreviation = '';
    if (!isLocked && currentSubmissionForUser && filteredPlayersByTeam) {
        for (const team of filteredPlayersByTeam) {
            const player = team.players?.find(p => p.id === currentSubmissionForUser.playerId);
            if (player) {
                currentPickTeamAbbreviation = team.abbreviation;
                break;
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
                        {/* Games Section */}
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
                                                        {game.starts_at ? format(parseISO(game.starts_at), 'h:mm a') : 'TBD'}
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
                                    {sortedSubmissions.map((user, index) => {
                                        const submission = user.submission;
                                        const gameStartsAt = submission?.gameStartsAt ? new Date(submission.gameStartsAt) : null;
                                        const isPickLocked = submission?.gameStatus !== 'STATUS_SCHEDULED' || (gameStartsAt && gameStartsAt <= now);
                                        const canShowPick = isPickLocked || user.userId === currentUserId;

                                        return (
                                            <Box
                                                key={user.username + index}
                                                p={3}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                bg={isLocked ? (index === 0 ? 'orange.50' : 'transparent') : (user.username === currentUserUsername ? 'blue.50' : 'transparent')}
                                                borderColor={isLocked ? (index === 0 ? 'orange.200' : 'gray.200') : (user.username === currentUserUsername ? 'blue.200' : 'gray.200')}
                                            >
                                                <HStack justify="space-between" align="flex-start">
                                                    <VStack align="start" spacing={1} flex={1} mr={2}>
                                                        <Text fontWeight="bold">{isLocked ? `${index + 1}. ` : ''}{user.username}</Text>
                                                        <Text fontSize="sm" color={submission ? "green.500" : "orange.500"} noOfLines={1}>
                                                            {!submission ? 'No Pick' : canShowPick ? submission.playerName : "Hidden"}
                                                        </Text>
                                                        {canShowPick && submission?.stats && (
                                                            <HStack gap={2} pt={1} width="100%">
                                                                <Text fontSize="xs" color="gray.600">PTS: {submission.stats.points ?? '-'}</Text>
                                                                <Text fontSize="xs" color="gray.600">REB: {submission.stats.rebounds ?? '-'}</Text>
                                                                <Text fontSize="xs" color="gray.600">AST: {submission.stats.assists ?? '-'}</Text>
                                                                <Text fontSize="xs" color="gray.600">STL: {submission.stats.steals ?? '-'}</Text>
                                                                <Text fontSize="xs" color="gray.600">BLK: {submission.stats.blocks ?? '-'}</Text>
                                                                <Text fontSize="xs" color="gray.600">TO: {submission.stats.turnovers ?? '-'}</Text>
                                                            </HStack>
                                                        )}
                                                    </VStack>
                                                    {isLocked ? (
                                                        <Badge
                                                            fontSize="md"
                                                            colorScheme={submission?.score === null && submission?.playerName ? 'gray' : 'orange'}
                                                            px={3} py={1} borderRadius="full"
                                                            visibility={canShowPick && submission?.playerName ? 'visible' : 'hidden'}
                                                        >
                                                            {submission?.score ?? 'N/A'} pts
                                                        </Badge>
                                                    ) : (
                                                        <Badge colorScheme={submission?.playerName ? 'green' : 'gray'} variant='subtle'>
                                                            {submission?.playerName ? 'Pick In' : 'No Pick'}
                                                        </Badge>
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
                                    maxH='300px'
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
                                                filteredPlayersByTeam.map((team) => (
                                                    <Stack key={team.teamId} pl={2} mb={2} spacing={1}>
                                                        <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                                                            {team.name}
                                                        </Text>
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
                                                                        isDisabled={!player.gameId || isPreviouslySubmitted || isSubmitting}
                                                                        isLoading={isSubmitting && currentSubmissionForUser?.playerId === player.id}
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