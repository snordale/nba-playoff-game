import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Stack, Text, Badge, Heading, VStack, HStack, Box, Divider, Grid
} from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

interface GameInfo {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  gameTime: string;
}

// Define PlayerStats interface
interface PlayerStats {
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
}

interface SubmissionDetail {
  username: string;
  playerName: string;
  score: number | null; // Note: score likely just reflects points
  stats: PlayerStats | null; // Add stats object
}

interface DailyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null; // YYYY-MM-DD format
  submissions: SubmissionDetail[] | undefined;
  games: GameInfo[] | undefined;
}

export const DailyDetailsModal: React.FC<DailyDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  submissions,
  games
}) => {
  if (!isOpen || !selectedDate) {
    return null;
  }

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');
  const sortedSubmissions = submissions ? [...submissions].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity)) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{displayDate}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {/* Games Section */}
          <Stack spacing={4}>
            <Heading size="sm" color="gray.700">Games</Heading>
            {games && games.length > 0 ? (
              games.map((game, index) => (
                <Box key={index} p={3} borderWidth="1px" borderRadius="md">
                  <VStack spacing={1} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">{game.gameTime}</Text>
                      <Badge colorScheme="gray">{game.status}</Badge>
                    </HStack>
                    <HStack justify="space-between" mt={1}>
                      <Text fontWeight="medium">{game.homeTeam}</Text>
                      <Text fontWeight="semibold">{game.homeScore ?? '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="medium">{game.awayTeam}</Text>
                      <Text fontWeight="semibold">{game.awayScore ?? '-'}</Text>
                    </HStack>
                  </VStack>
                </Box>
              ))
            ) : (
              <Text color="gray.500">No games scheduled for this date.</Text>
            )}
          </Stack>

          <Divider my={4} />

          {/* Submissions Section */}
          <Stack spacing={4}>
            <Heading size="sm" color="gray.700">Player Picks</Heading>
            {sortedSubmissions.length === 0 ? (
              <Text color="gray.500">No submissions were made for this day.</Text>
            ) : (
              <Stack spacing={3}>
                {sortedSubmissions.map((sub, index) => (
                  <Box
                    key={index}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    bg={index === 0 ? 'orange.50' : 'transparent'}
                  >
                    <HStack justify="space-between" align="flex-start">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">{index + 1}. {sub.username}</Text>
                        <Text fontSize="sm" color="gray.600">{sub.playerName}</Text>
                      </VStack>
                      <Badge
                        fontSize="md"
                        colorScheme={sub.score === null ? 'gray' : 'orange'}
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        {sub.score ?? 'N/A'} pts
                      </Badge>
                    </HStack>
                    {sub.stats && (
                      <HStack gap={2} pt={1} flex={1}>
                        <Text fontSize="xs" color="gray.500">PTS: {sub.stats.points ?? '-'}</Text>
                        <Text fontSize="xs" color="gray.500">REB: {sub.stats.rebounds ?? '-'}</Text>
                        <Text fontSize="xs" color="gray.500">AST: {sub.stats.assists ?? '-'}</Text>
                        <Text fontSize="xs" color="gray.500">STL: {sub.stats.steals ?? '-'}</Text>
                        <Text fontSize="xs" color="gray.500">BLK: {sub.stats.blocks ?? '-'}</Text>
                        <Text fontSize="xs" color="gray.500">TO: {sub.stats.turnovers ?? '-'}</Text>
                      </HStack>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};