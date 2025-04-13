import { Body1 } from '../../Body1';
import { useGetGroup } from '../../../react-query/queries';
import { TimeIcon } from '@chakra-ui/icons';
import { Box, IconButton, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverHeader, Text } from '@chakra-ui/react';
import React, { useMemo, useState } from 'react';

export const WhoSubmitted = ({ groupId }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openPopover = () => setPopoverOpen(true);
  const closePopover = () => setPopoverOpen(false);

  const { data: groupData } = useGetGroup({ groupId });

  const futureSubmissions = useMemo(() => groupData?.futureSubmissions, [groupData?.futureSubmissions]);
  const players = useMemo(() => groupData?.players, [groupData?.players]);

  const playerIdsWhoSubmitted = useMemo(() => {
    return futureSubmissions?.map(submission => submission.playerId) || [];
  }, [futureSubmissions]);

  console.log('playerIdsWhoSubmitted');
  console.log(playerIdsWhoSubmitted);

  const playersWhoDidNotSubmit = useMemo(() => {
    return players?.filter(player => !playerIdsWhoSubmitted.includes(player.id)).map(player => player.user.username) || [];
  }, [players, playerIdsWhoSubmitted]);

  const todaysDate = new Date().toLocaleDateString();

  return (
    <Box>
      <IconButton
        icon={<TimeIcon />}
        aria-label="Who Submitted"
        variant="outline"
        size="sm"
        onClick={openPopover}
      />
      <Popover
        isOpen={popoverOpen}
        onClose={closePopover}
        placement="bottom"
        closeOnBlur={true}
      >
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader>Submissions</PopoverHeader>
          <PopoverBody>
            {futureSubmissions?.length > 0 ? (
              <>
                {playersWhoDidNotSubmit.length > 0 && (
                  <Box mt={4}>
                    <Body1>Players who haven't submitted:</Body1>
                    {playersWhoDidNotSubmit.map((playerName) => (
                      <Text key={playerName}>{playerName}</Text>
                    ))}
                  </Box>
                )}
              </>
            ) : (
              <Body1>No submissions yet.</Body1>
            )}
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Box>
  )
}