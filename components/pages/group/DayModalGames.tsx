import { Box, Grid, HStack, Spinner, Stack, Text, VStack, Heading } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

// Define the type inline based on usage
interface GameWithTeams {
    id: string;
    homeTeam: { abbreviation: string };
    homeScore: number | null;
    awayTeam: { abbreviation: string };
    awayScore: number | null;
    starts_at: string | null; // Assuming string based on parseISO usage
    status: string;
}

// Helper function (can be kept here or moved to utils if used elsewhere)
function getStatusColor(status: string) {
    const statusToColor = {
        'STATUS_SCHEDULED': 'green.600',
        'STATUS_FINAL': 'red.500',
        'STATUS_IN_PROGRESS': 'blue.500',
        'STATUS_HALFTIME': 'blue.500',
        'STATUS_END_OF_REGULATION': 'blue.500',
        'STATUS_POSTPONED': 'orange.500',
        'STATUS_CANCELED': 'orange.500',
        'STATUS_DELAYED': 'orange.500',
    }

    return statusToColor[status as keyof typeof statusToColor] || 'gray.500';
}

interface DayModalGamesProps {
    games: GameWithTeams[] | undefined; // Use the inline type
    isLoading: boolean;
}

export const DayModalGames = ({ games, isLoading }: DayModalGamesProps) => {
    return (
        <Stack gap={2}>
            <Heading size="sm" color="gray.700">Games</Heading>
            {isLoading ? (
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
    );
}; 