import { useGetGames, useGetPlayers } from '@/react-query/queries';
import { Divider, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Stack, useToast } from '@chakra-ui/react';
import { isBefore } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { DayModalGames } from './DayModalGames';
import { DayModalSubmissionInput } from './DayModalSubmissionInput';
import { DayModalSubmissions } from './DayModalSubmissions';
import { useGroup } from './GroupContext';

interface DayModalProps {
    isOpen: boolean;
    onClose: (refresh?: boolean) => void;
    onSubmit: (submissionData: { gameId: string; playerId: string }) => Promise<void>;
    search: string;
    onSearchChange: (value: string) => void;
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
    onSubmit,
    search,
    onSearchChange,
}: DayModalProps) => {
    const { data: sessionData } = useSession();
    const { submissionsByDate, selectedDate, previouslySubmittedPlayerIdsForCurrentUser } = useGroup();
    const users = submissionsByDate?.[selectedDate] ?? [];
    const currentUserId = sessionData?.user?.id;
    const TIMEZONE = 'America/New_York';
    console.log(selectedDate)
    console.log(users)

    // Display date formatted correctly using formatInTimeZone
    const displayDate = selectedDate
        ? formatInTimeZone(fromZonedTime(`${selectedDate}T00:00:00`, TIMEZONE), TIMEZONE, 'MMMM d, yyyy')
        : 'Selected Date';

    const { data: games, isLoading: loadingGames } = useGetGames({ date: selectedDate });
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const now = new Date();

    // Determine if the day is locked (entire day is in the past relative to NY time)
    const endOfDayNY = fromZonedTime(`${selectedDate}T23:59:59.999`, TIMEZONE);
    const isLocked = isBefore(endOfDayNY, now);

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
                    alreadySubmitted: previouslySubmittedPlayerIdsForCurrentUser?.includes(player.id) ?? false,
                    gameId: player.gameId
                });

                acc[teamId].players.sort((a, b) => a.name.localeCompare(b.name));

                return acc;
            }, {});

        return Object.values(playersByTeam).sort((a, b) => a.name.localeCompare(b.name));

    }, [playersForSelectionData, search, previouslySubmittedPlayerIdsForCurrentUser, isLocked]);

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

    // Sort submissions for display (using the prop passed from parent)
    const sortedSubmissions = useMemo(() => {
        if (!users) return [];
        return [...users].sort((a, b) => ((b?.submission?.score ?? -Infinity) - (a?.submission?.score ?? -Infinity)));
    }, [users]);

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(false)} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent maxH="90vh">
                <ModalHeader borderBottomWidth={1} borderColor="orange.600">{displayDate}</ModalHeader>
                <ModalCloseButton onClick={() => onClose(false)} />
                <ModalBody pb={6} overflowY="auto">
                    <Stack gap={4}>
                        {/* Games Section */}
                        <DayModalGames games={games} isLoading={loadingGames} />

                        <Divider />

                        {/* Submissions Display Section */}
                        <DayModalSubmissions
                            submissions={sortedSubmissions}
                            isLoading={false}
                            isLocked={isLocked}
                            currentUserId={currentUserId}
                        />

                        {/* Conditional Submission Section */}
                        {!isLocked && (
                            <>
                                <Divider />
                                <DayModalSubmissionInput
                                    search={search}
                                    onSearchChange={onSearchChange}
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