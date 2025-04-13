import { Body1 } from '../../Body1';
import { useGetGroup } from '../../../react-query/queries';
import { TimeIcon } from '@chakra-ui/icons';
import { Box, IconButton, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverHeader, Text, Spinner, Center, Stack } from '@chakra-ui/react';
import React, { useMemo, useState } from 'react';
import { format, startOfToday, isEqual, startOfDay, parseISO } from 'date-fns';

export const WhoSubmitted = ({ groupId }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openPopover = () => setPopoverOpen(true);
  const closePopover = () => setPopoverOpen(false);

  const { data: groupData, isLoading } = useGetGroup({ groupId });

  const todayKey = format(startOfToday(), 'yyyy-MM-dd');

  const userIdsWhoSubmittedToday = useMemo(() => {
    const userIds = new Set<string>();
    if (!groupData?.players) return userIds;

    groupData.players.forEach(player => {
      player.submissions?.forEach(sub => {
        if (!sub.gameDate) return;
        const subGameDateKey = format(startOfDay(parseISO(sub.gameDate.toISOString())), 'yyyy-MM-dd');
        if (subGameDateKey === todayKey) {
          userIds.add(player.userId);
        }
      });
    });
    return userIds;
  }, [groupData, todayKey]);

  const playersWhoDidNotSubmit = useMemo(() => {
    if (!groupData?.players) return [];
    return groupData.players
      .filter(player => !userIdsWhoSubmittedToday.has(player.userId))
      .map(player => player.username);
  }, [groupData, userIdsWhoSubmittedToday]);

  return (
    <Box>
      <IconButton
        icon={<TimeIcon />}
        aria-label="Who Submitted Today"
        variant="outline"
        size="sm"
        colorScheme="orange"
        onClick={openPopover}
        isLoading={isLoading}
      />
      <Popover
        isOpen={popoverOpen}
        onClose={closePopover}
        placement="bottom-end"
        closeOnBlur={true}
      >
        <PopoverContent minW={{ base: "250px", md: "300px" }}>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader fontWeight="semibold">Submissions for {format(startOfToday(), 'MMM d')}</PopoverHeader>
          <PopoverBody>
            {isLoading ? (
              <Center p={4}><Spinner color="orange.500" /></Center>
            ) : groupData?.players && groupData.players.length > 0 ? (
              playersWhoDidNotSubmit.length > 0 ? (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Waiting for:</Text>
                  <Stack spacing={0.5}>
                    {playersWhoDidNotSubmit.map((username) => (
                      <Text fontSize="sm" key={username}>{username}</Text>
                    ))}
                  </Stack>
                </Box>
              ) : (
                <Text fontSize="sm" color="green.600">Everyone has submitted for today!</Text>
              )
            ) : (
              <Text fontSize="sm">No members in this group yet.</Text>
            )}
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Box>
  )
}