import { Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { useGroup } from './GroupContext';

export const Leaderboard = () => {
  const { leaderboardUsers } = useGroup();

  return (
    <Stack maxWidth="500px">
      <Text fontWeight="semibold">Leaderboard</Text>
      <TableContainer>
        <Table variant='simple' size='sm'>
          <Thead>
            <Tr>
              <Th px={2} py={1}>Rank</Th>
              <Th px={2} py={1}>Player</Th>
              <Th px={2} py={1} isNumeric>Score</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leaderboardUsers?.map((player, index) => (
              <Tr key={player.userId}>
                <Td px={2} py={1} width="50px" textAlign="center">{index + 1}</Td>
                <Td px={2} py={1}>{player.username}</Td>
                <Td px={2} py={1} isNumeric>{player.score}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Stack>
  )
}