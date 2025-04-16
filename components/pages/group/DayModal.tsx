import { useGetGames, useGetPlayers } from '@/react-query/queries';
import { type SubmissionView } from '@/utils/submission-utils';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { Badge, Box, Button, Divider, Grid, HStack, Heading, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, Stack, Text, VStack, useToast } from '@chakra-ui/react';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { DayModalGames } from './DayModalGames';
import { DayModalSubmissions } from './DayModalSubmissions';
import { DayModalSubmissionInput } from './DayModalSubmissionInput';

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
                        <DayModalGames games={games} isLoading={loadingGames} />

                        <Divider />

                        {/* Submissions Display Section */}
                        <DayModalSubmissions
                            submissions={sortedSubmissions}
                            isLoading={false}
                            isLocked={isLocked}
                            currentUserUsername={currentUserUsername}
                            currentUserId={currentUserId}
                        />

                        {/* Conditional Submission Section */}
                        {!isLocked && (
                            <>
                                <Divider />
                                <DayModalSubmissionInput
                                    search={search}
                                    onSearchChange={onSearchChange}
                                    currentSubmissionForUser={currentSubmissionForUser}
                                    currentPickTeamAbbreviation={currentPickTeamAbbreviation}
                                    filteredPlayersByTeam={filteredPlayersByTeam}
                                    loadingPlayers={loadingPlayers}
                                    isSubmitting={isSubmitting}
                                    handleSubmit={handleSubmit}
                                />
                            </>
                        )}
                    </Stack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}; 