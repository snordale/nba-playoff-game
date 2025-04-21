// components/pages/group/DailySubmissionCard.tsx
import { UserView } from '@/utils/submission-utils';
import { Badge, Card, CardBody, HStack, Text, VStack } from "@chakra-ui/react";
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { useSession } from 'next-auth/react';
import React from 'react';
import { useGroup } from './GroupContext';

// Define expected stats structure (can be imported if defined centrally)
interface PlayerStats {
    points: number | null;
    rebounds: number | null;
    assists: number | null;
    steals: number | null;
    blocks: number | null;
    turnovers: number | null;
}

// Define the structure for a player's submission within the card props
type PlayerSubmission = {
    playerName: string | null; // Can be null
    score: number | null;
    stats: PlayerStats | null;
    gameStatus?: string;
    gameDate?: string | Date;
    gameStartsAt?: string;
}

type DailySubmissionCardProps = {
    date: string; // YYYY-MM-DD
    gameCount: number;
    isToday: boolean;
    isInPast: boolean;
    usersWithSubmissions: UserView[];
}

export const DailySubmissionCard: React.FC<DailySubmissionCardProps> = ({
    date,
    gameCount,
    usersWithSubmissions,
    isToday,
    isInPast
}) => {
    const { handleDayClick } = useGroup();
    const { data: sessionData } = useSession();
    const currentUserId = sessionData?.user?.id;
    const hasGames = gameCount > 0;
    const TIMEZONE = 'America/New_York';

    // Parse the NY date string into a Date object representing the start of that day in NY time
    const dateInNY = fromZonedTime(`${date}T00:00:00`, TIMEZONE);

    const formattedDateString = formatInTimeZone(
        dateInNY,
        TIMEZONE,
        'MMM d, yyyy'
    )

    return (
        <Card
            variant="outline"
            w="full"
            cursor="pointer"
            onClick={() => handleDayClick(date)}
            borderColor={isToday ? "orange.500" : undefined}
            _hover={{
                borderColor: "orange.300",
                transform: "translateY(-1px)",
                transition: "all 0.2s ease-in-out"
            }}
        >
            <CardBody>
                <VStack align="start" spacing={2} width="100%">
                    {/* Header: Date and Status */}
                    <HStack justify="space-between" width="100%">
                        <VStack align="start" spacing={0}>
                            <Text fontWeight={isToday ? "bold" : "semibold"} color={isToday ? "orange.500" : undefined}>
                                {formattedDateString}
                                {isToday && " (Today)"}
                            </Text>
                            {hasGames && (
                                <Text fontSize="xs" color="gray.500">
                                    {gameCount} {gameCount === 1 ? 'game' : 'games'}
                                </Text>
                            )}
                        </VStack>
                        {hasGames && (
                            <Text fontSize="sm" color={isInPast ? "gray.600" : "orange.500"} fontWeight="medium">
                                {(isInPast && !isToday) ? "Final" : "Open"}
                            </Text>
                        )}
                    </HStack>

                    {/* Body: Player Submissions */}
                    {hasGames ? (
                        <VStack align="stretch" width="100%" spacing={1}>
                            {usersWithSubmissions.map(({ userId, username, submission }) => {
                                return (
                                    <VStack key={userId} align="stretch" borderTopWidth={1} borderColor="gray.100" pt={2} mt={1} gap={0}>
                                        {/* Username and Score/Status */}
                                        <HStack justify="space-between" width="100%">
                                            <VStack width="100%" gap={0} alignItems='flex-start'>
                                                <Text fontSize="xs" fontWeight="medium">{username}</Text>
                                                <Text
                                                    fontSize="xs"
                                                    color={submission ? "green.500" : "orange.500"}
                                                    fontWeight="medium"
                                                >
                                                    {!submission ? 'No Pick' : submission.playerName || "Hidden"}
                                                </Text>
                                            </VStack>
                                            {submission?.stats && (
                                                <Badge colorScheme="orange">
                                                    {submission.score} pts
                                                </Badge>
                                            )}
                                        </HStack>
                                    </VStack>
                                );
                            })}
                        </VStack>
                    ) : (
                        <Text color="gray.500">No games</Text>
                    )}
                </VStack>
            </CardBody>
        </Card>
    );
};