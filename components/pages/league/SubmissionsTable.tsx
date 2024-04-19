import { Body1 } from '@/components/Body1'
import { useGetLeague } from '@/react-query/queries'
import { Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'

const SubmissionsTable = ({ leagueId }) => {
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
              <Th >Score</Th>
              <Th isNumeric>P</Th>
              <Th isNumeric>A</Th>
              <Th isNumeric>R</Th>
              <Th isNumeric>S</Th>
              <Th isNumeric>B</Th>
            </Tr>
          </Thead>
          <Tbody>
            {oldSubmissions?.map(submission => {
              return (
                <Tr>
                  <Td>{submission.playerName}</Td>
                  <Td isNumeric>{submission.score}</Td>
                  <Td isNumeric>{submission.points}</Td>
                  <Td isNumeric>{submission.assists}</Td>
                  <Td isNumeric>{submission.rebounds}</Td>
                  <Td isNumeric>{submission.steals}</Td>
                  <Td isNumeric>{submission.blocks}</Td>
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