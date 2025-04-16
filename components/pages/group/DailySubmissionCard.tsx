// components/pages/group/DailySubmissionCard.tsx
import React from 'react';
import { Badge, Card, CardBody, HStack, Text, VStack } from "@chakra-ui/react";
import { format, isBefore, parseISO, startOfDay as dateFnsStartOfDay } from 'date-fns';

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

// Define the structure for each player object in the players array
type UserForCard = {
    userId: string;
    username: string;
    submission: PlayerSubmission | null;
}

interface DailySubmissionCardProps {
    date: string; // YYYY-MM-DD
    hasGames: boolean;
    onClick: (date: string) => void;
    users: UserForCard[];
    currentUserId: string | undefined; // Add currentUserId prop
}

export const DailySubmissionCard: React.FC<DailySubmissionCardProps> = ({ date, hasGames, onClick, users, currentUserId }) => {
    const formattedDate = format(parseISO(date), 'MMM d, yyyy');
    const isToday = new Date(date).toDateString() === new Date().toDateString();
    const isDayLocked = isBefore(dateFnsStartOfDay(new Date(date)), dateFnsStartOfDay(new Date()));
    const now = new Date();

    return (
        <Card
            variant="outline"
            w="full"
            cursor="pointer"
            onClick={() => onClick(date)}
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
                        <Text fontWeight={isToday ? "bold" : "semibold"} color={isToday ? "orange.500" : undefined}>
                            {formattedDate}
                            {isToday && " (Today)"}
                        </Text>
                        {hasGames && (
                            <Text fontSize="sm" color={isDayLocked ? "gray.600" : "orange.500"} fontWeight="medium">
                                {isDayLocked ? "Final" : "Open"}
                            </Text>
                        )}
                    </HStack>

                    {/* Body: Player Submissions */}
                    {hasGames ? (
                        <VStack align="stretch" width="100%" spacing={1}>
                            {users.map((user) => {
                                const submission = user.submission;
                                const gameStartsAt = submission?.gameStartsAt ? new Date(submission.gameStartsAt) : null;
                                const isPickLocked = submission?.gameStatus !== 'STATUS_SCHEDULED' || (gameStartsAt && gameStartsAt <= now);
                                const canShowPick = isPickLocked || user.userId === currentUserId;

                                return (
                                    <VStack key={user.userId} align="stretch" borderTopWidth={1} borderColor="gray.100" pt={2} mt={1} gap={0}>
                                        {/* Username and Score/Status */}
                                        <HStack justify="space-between" width="100%">
                                            <Text fontSize="xs" fontWeight="medium">{user.username}</Text>
                                            {isDayLocked ? (
                                                submission ? (
                                                    <HStack>
                                                        <Text fontSize="xs" fontWeight="medium">{submission.playerName}</Text>
                                                        <Badge
                                                            colorScheme={submission.score !== null ? "orange" : "gray"}
                                                            visibility={canShowPick || submission.score !== null ? 'visible' : 'hidden'}
                                                        >
                                                            {submission.score !== null ? `${submission.score} pts` : 'N/A'}
                                                        </Badge>
                                                    </HStack>
                                                ) : (
                                                    <Text fontSize="xs" color="red.500">No pick</Text>
                                                )
                                            ) : (
                                                <Text fontSize="xs" color={submission ? "green.500" : "orange.500"}>
                                                    {submission && canShowPick ? submission?.playerName : (submission?.playerName ? "Hidden" : "No Pick")}
                                                </Text>
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