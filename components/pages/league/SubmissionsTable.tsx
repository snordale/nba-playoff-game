import { Body1 } from '@/components/Body1';
import { useGetLeague } from '@/react-query/queries';
import { Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';

const SubmissionsTable = ({ leagueId }) => {
  const { data: leagueData } = useGetLeague({ leagueId });

  const oldSubmissions = leagueData?.players.flatMap(player => {
    return player.submissions.flatMap(submission => {
      return {
        ...submission,
        username: player.user.username,
      }
    })
  })

  return (
    <Stack>
      <Body1 fontWeight={600} pt={4}>Past Submissions</Body1>
      <TableContainer border='1px solid #ddd' borderRadius={4} overflow='scroll' flex={1} py={2}>
        <Table variant='simple' size='sm'>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>User</Th>
              <Th>Player</Th>
              <Th>Score</Th>
              <Th isNumeric>P</Th>
              <Th isNumeric>A</Th>
              <Th isNumeric>R</Th>
              <Th isNumeric>S</Th>
              <Th isNumeric>B</Th>
              <Th isNumeric>T</Th>
            </Tr>
          </Thead>
          <Tbody>
            {oldSubmissions?.map(submission => {
              return (
                <Tr>
                  <Td>{new Date(submission.createdAt).toLocaleDateString()}</Td>
                  <Td>{submission.username}</Td>
                  <Td>{submission.playerName}</Td>
                  <Td isNumeric>{submission.score}</Td>
                  <Td isNumeric>{submission.points}</Td>
                  <Td isNumeric>{submission.assists}</Td>
                  <Td isNumeric>{submission.rebounds}</Td>
                  <Td isNumeric>{submission.steals}</Td>
                  <Td isNumeric>{submission.blocks}</Td>
                  <Td isNumeric>{submission.turnovers}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Stack>
  )
}

export default SubmissionsTable