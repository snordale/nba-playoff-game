import { Body1 } from '@/components/Body1'
import { useGetLeague } from '@/react-query/queries'
import { Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'

export const Leaderboard = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const leagueId = searchParams.get('leagueId');
  const { data: leagueData } = useGetLeague({ leagueId });

  return (
    <Stack>
      <Body1 fontWeight={600} pt={4}>Leaderboard</Body1>
      <TableContainer>
        <Table variant='simple'>
          <Thead>
            <Tr>
              <Th>Player</Th>
              <Th isNumeric>Score</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leagueData?.players.map(player => (
              <Tr>
                <Td>
                  {player.user.username}
                </Td>
                <Td isNumeric>
                  {player.score}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Stack>
  )
}