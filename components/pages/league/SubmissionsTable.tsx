import { scoreSubmission } from '@/app/utils'
import { Body1 } from '@/components/Body1'
import { useGetLeague } from '@/react-query/queries'
import { Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'

const SubmissionsTable = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const leagueId = searchParams.get('leagueId');
  const { data: leagueData } = useGetLeague({ leagueId });

  const oldSubmissions = leagueData?.players.flatMap(player => player.submissions)

  return (
    <Stack>
      <Body1 fontWeight={600} pt={4}>Past Submissions</Body1>
      <TableContainer>
        <Table variant='simple'>
          <Thead>
            <Tr>
              <Th>Player</Th>
              <Th isNumeric>P</Th>
              <Th isNumeric>A</Th>
              <Th isNumeric>R</Th>
              <Th isNumeric>S</Th>
              <Th isNumeric>B</Th>
            </Tr>
          </Thead>
          <Tbody>
            {oldSubmissions?.map(submission => {
              const totalPoints = scoreSubmission(submission)
              return (
                <Tr>
                  <Td>{submission.playerName}</Td>
                  <Td isNumeric>{submission.points}</Td>
                  <Td isNumeric>{submission.assists}</Td>
                  <Td isNumeric>{submission.rebounds}</Td>
                  <Td isNumeric>{submission.steals}</Td>
                  <Td isNumeric>{submission.blocks}</Td>
                  <Td isNumeric>{totalPoints}</Td>
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