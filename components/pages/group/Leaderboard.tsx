import { Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { useGroup } from './GroupContext';

interface LeaderboardUser {
  userId: string;
  username: string;
  score: number;
}

interface LeaderboardProps {
  /** Override the users to display; defaults to daily-picks leaderboard from context. */
  users?: LeaderboardUser[];
  /** Label shown above the table. */
  title?: string;
  /** Placeholder text when there are no users/scores. */
  emptyText?: string;
}

export const Leaderboard = ({
  users: overrideUsers,
  title = "Leaderboard",
  emptyText = "No scores yet. Make daily picks to appear here.",
}: LeaderboardProps) => {
  const { leaderboardUsers } = useGroup();
  const users = overrideUsers ?? leaderboardUsers;
  const hasUsers = users && users.length > 0;

  return (
    <Stack maxWidth="500px">
      <Text fontWeight="semibold">{title}</Text>
      <TableContainer>
        <Table variant="simple" size="sm" aria-label={title}>
          <Thead>
            <Tr>
              <Th px={2} py={1}>Rank</Th>
              <Th px={2} py={1}>Player</Th>
              <Th px={2} py={1} isNumeric>Score</Th>
            </Tr>
          </Thead>
          <Tbody>
            {hasUsers ? (
              users.map((player, index) => (
                <Tr key={player.userId}>
                  <Td px={2} py={1} width="50px" textAlign="center">{index + 1}</Td>
                  <Td px={2} py={1}>{player.username}</Td>
                  <Td px={2} py={1} isNumeric>{player.score}</Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={3} py={4} textAlign="center" color="gray.500" fontSize="sm">
                  {emptyText}
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Stack>
  );
}