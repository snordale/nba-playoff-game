import { Badge, Box, HStack, Heading, Spinner, Stack, Text, VStack } from '@chakra-ui/react';
import { type SubmissionView, isPickLocked } from '@/utils/submission-utils';

interface DayModalSubmissionsProps {
    submissions: {
        userId: string;
        username: string;
        submission: SubmissionView | null;
    }[];
    isLoading: boolean;
    isLocked: boolean;
    currentUserId: string | undefined;
}

export const DayModalSubmissions = ({
    submissions,
    isLoading,
    isLocked,
    currentUserId,
}: DayModalSubmissionsProps) => {
    return (
        <Stack spacing={3}>
            <Heading size="sm" color="gray.700">Player Picks</Heading>
            {isLoading ? (
                <HStack py={2} justifyContent='center'><Spinner color="orange.500" size="sm" /></HStack>
            ) : submissions.length === 0 ? (
                <Text color="gray.500">No submissions yet for this day.</Text>
            ) : (
                <Stack spacing={3} pr={2}>
                    {submissions.map((user, index) => {
                        const submission = user?.submission;
                        const gameStartsAt = submission?.gameStartsAt ? new Date(submission.gameStartsAt) : null;
                        const pickIsLocked = isPickLocked(submission?.gameStatus ?? '', gameStartsAt);
                        const canShowPick = pickIsLocked || user.userId === currentUserId;

                        return (
                            <Box
                                key={user.userId + index}
                                p={3}
                                borderWidth="1px"
                                borderRadius="md"
                                borderColor='gray.200'
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
                                        <Badge colorScheme={submission ? 'green' : 'gray'} variant='subtle'>
                                            {submission ? 'Pick In' : 'No Pick'}
                                        </Badge>
                                    )}
                                </HStack>
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Stack>
    );
}; 