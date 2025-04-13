import React from 'react';
import { Body1 } from '../../Body1'
import { useGetGroup } from "../../../react-query/queries"
import { Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'

export const Leaderboard = ({ groupId }) => {
  const { data: groupData } = useGetGroup({ groupId });

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
            {groupData?.players.map(player => (
              <Tr key={player.userId}>
                <Td>
                  {player.username}
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