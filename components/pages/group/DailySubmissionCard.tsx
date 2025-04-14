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
interface PlayerSubmission {
    playerName: string;
    score: number | null;
    stats: PlayerStats | null; // Include stats, even if not displayed here currently
}

// Define the structure for each player object in the players array
interface PlayerForCard {
    userId: string;
    username: string;
    submission: PlayerSubmission | null;
}

interface DailySubmissionCardProps {
    date: string; // YYYY-MM-DD
    hasGames: boolean;
    onClick: (date: string) => void;
    players: PlayerForCard[];
}

export const DailySubmissionCard: React.FC<DailySubmissionCardProps> = ({ date, hasGames, onClick, players }) => {
    const formattedDate = format(parseISO(date), 'MMM d, yyyy');
    const isToday = new Date(date).toDateString() === new Date().toDateString();
    const today = dateFnsStartOfDay(new Date());
    const cardDate = dateFnsStartOfDay(new Date(date));
    const isLocked = isBefore(cardDate, today);

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
                            <Text fontSize="sm" color={isLocked ? "gray.600" : "orange.500"} fontWeight="medium">
                                {isLocked ? "Final" : "Open"}
                            </Text>
                        )}
                    </HStack>

                    {/* Body: Player Submissions */}
                    {hasGames ? (
                        <VStack align="stretch" width="100%" spacing={1}>
                            {players.map((player) => (
                                <VStack key={player.userId} align="stretch" borderTopWidth={1} borderColor="gray.100" pt={2} mt={1}>
                                    {/* Username and Score/Status */}
                                    <HStack justify="space-between" width="100%">
                                        <Text fontSize="sm" fontWeight="medium">{player.username}</Text>
                                        {isLocked ? (
                                            player.submission ? (
                                                <Badge colorScheme={player.submission.score !== null ? "orange" : "gray"}>
                                                    {player.submission.score !== null ? `${player.submission.score} pts` : 'N/A'}
                                                </Badge>
                                            ) : (
                                                <Text fontSize="sm" color="red.500">No pick</Text>
                                            )
                                        ) : (
                                            <Text fontSize="sm" color={player.submission ? "green.500" : "orange.500"}>
                                                {player.submission ? "Pick made" : "No pick"}
                                            </Text>
                                        )}
                                    </HStack>
                                    {/* Player Name */}
                                    {player.submission && (
                                        <Text fontSize="sm" color="gray.700" pl={2}>{player.submission.playerName}</Text>
                                    )}
                                </VStack>
                            ))}
                        </VStack>
                    ) : (
                        <Text color="gray.500">No games</Text>
                    )}
                </VStack>
            </CardBody>
        </Card>
    );
};