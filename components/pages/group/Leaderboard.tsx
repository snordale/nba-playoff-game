import { Stack, TableRoot, TableHeader, TableBody, TableRow, TableCell, TableColumnHeader, Text, Box } from '@chakra-ui/react';
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
      <Box overflowX="auto">
        <TableRoot variant="outline" size="sm" aria-label={title}>
          <TableHeader>
            <TableRow>
              <TableColumnHeader px={2} py={1}>Rank</TableColumnHeader>
              <TableColumnHeader px={2} py={1}>Player</TableColumnHeader>
              <TableColumnHeader px={2} py={1} textAlign="end">Score</TableColumnHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasUsers ? (
              users.map((player, index) => (
                <TableRow key={player.userId}>
                  <TableCell px={2} py={1} width="50px" textAlign="center">{index + 1}</TableCell>
                  <TableCell px={2} py={1}>{player.username}</TableCell>
                  <TableCell px={2} py={1} textAlign="end">{player.score}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} py={4} textAlign="center" color="gray.500" fontSize="sm">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableRoot>
      </Box>
    </Stack>
  );
}