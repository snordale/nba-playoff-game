import { CheckCircleIcon } from '@chakra-ui/icons';
import { Button, HStack, Heading, Input, Spinner, Stack, Text } from '@chakra-ui/react';
import { useGroup } from './GroupContext';

// Re-define or import these types if not globally available
interface PlayerForSelection {
    id: string;
    name: string;
    alreadySubmitted: boolean;
    gameId: string;
}
interface TeamForSelection {
    teamId: string;
    name: string;
    abbreviation: string;
    players: PlayerForSelection[];
}

interface DayModalSubmissionInputProps {
    search: string;
    onSearchChange: (value: string) => void;
    filteredPlayersByTeam: TeamForSelection[];
    loadingPlayers: boolean;
    isSubmitting: boolean;
    handleSubmit: (submissionData: { gameId: string; playerId: string }) => Promise<void>;
}

export const DayModalSubmissionInput = ({
    search,
    onSearchChange,
    filteredPlayersByTeam,
    loadingPlayers,
    isSubmitting,
    handleSubmit,
}: DayModalSubmissionInputProps) => {
    const { currentUserId, currentUserUsername, submissionsByDate, selectedDate } = useGroup();
    const user = submissionsByDate?.[selectedDate]?.find(user => user.userId === currentUserId);
    return (
        <>
            <Stack gap={2}>
                <Heading size="sm" color="gray.700">Make Your Pick</Heading>
                <Input
                    value={search}
                    placeholder="Search players..."
                    onChange={e => onSearchChange(e.target.value)}
                />
                {user?.submission && (
                    <Text
                        fontSize="sm"
                        fontWeight="semibold" color="orange.600" textAlign="center" p={1} borderWidth={1} borderRadius="md" borderColor="orange.200" bg="orange.50">
                        Current Pick: {user?.submission.playerName}
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
                                            const isCurrentPick = user?.submission?.playerName === player.id;
                                            const isPreviouslySubmitted = player.alreadySubmitted && !isCurrentPick;

                                            return (
                                                <Button
                                                    size='sm'
                                                    variant={isCurrentPick ? 'solid' : 'ghost'}
                                                    colorScheme='orange'
                                                    flexShrink={0}
                                                    key={player.id}
                                                    isDisabled={!player.gameId || isPreviouslySubmitted || isSubmitting}
                                                    isLoading={isSubmitting && user.submission?.playerId === player.id}
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
    );
}; 