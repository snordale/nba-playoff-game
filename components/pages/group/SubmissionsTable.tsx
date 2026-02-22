import React from 'react';
import { Body1 } from '../../Body1';
import { useGetGroup } from '../../../react-query/queries';
import { Stack, TableRoot, TableHeader, TableBody, TableRow, TableCell, TableColumnHeader, Box } from '@chakra-ui/react';

export const SubmissionsTable = ({ groupId }: { groupId: string }) => {
  const { data: groupData } = useGetGroup({ groupId });

  const oldSubmissions = (groupData as any)?.players?.flatMap((player: any) => {
    return player.submissions.flatMap((submission: any) => {
      return {
        ...submission,
        username: player.user.username,
      };
    });
  })?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Stack>
      <Body1 fontWeight={600} pt={4}>Past Submissions</Body1>
      <Box border='1px solid #ddd' borderRadius={4} overflow='auto' flex={1} py={2}>
        <TableRoot variant='outline' size='sm'>
          <TableHeader>
            <TableRow>
              <TableColumnHeader>Date</TableColumnHeader>
              <TableColumnHeader>User</TableColumnHeader>
              <TableColumnHeader>Player</TableColumnHeader>
              <TableColumnHeader>Score</TableColumnHeader>
              <TableColumnHeader textAlign="end">P</TableColumnHeader>
              <TableColumnHeader textAlign="end">A</TableColumnHeader>
              <TableColumnHeader textAlign="end">R</TableColumnHeader>
              <TableColumnHeader textAlign="end">S</TableColumnHeader>
              <TableColumnHeader textAlign="end">B</TableColumnHeader>
              <TableColumnHeader textAlign="end">T</TableColumnHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {oldSubmissions?.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} py={4}>No submissions yet</TableCell>
              </TableRow>
            )}
            {oldSubmissions?.map((submission: any) => {
              return (
                <TableRow key={submission.id}>
                  <TableCell>{new Date(submission.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{submission.username}</TableCell>
                  <TableCell>{submission.playerName}</TableCell>
                  <TableCell textAlign="end">{submission.score}</TableCell>
                  <TableCell textAlign="end">{submission.points}</TableCell>
                  <TableCell textAlign="end">{submission.assists}</TableCell>
                  <TableCell textAlign="end">{submission.rebounds}</TableCell>
                  <TableCell textAlign="end">{submission.steals}</TableCell>
                  <TableCell textAlign="end">{submission.blocks}</TableCell>
                  <TableCell textAlign="end">{submission.turnovers}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </TableRoot>
      </Box>
    </Stack>
  )
}