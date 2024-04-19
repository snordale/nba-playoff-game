import { Body1 } from '@/components/Body1';
import { useGetLeague } from '@/react-query/queries';
import { TimeIcon } from '@chakra-ui/icons';
import { Box, IconButton, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverHeader, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

const WhoSubmitted = ({ leagueId }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openPopover = () => setPopoverOpen(true);
  const closePopover = () => setPopoverOpen(false);

  const { data: leagueData } = useGetLeague({ leagueId });

  const todaysSubmissions = useMemo(() => leagueData?.todaysSubmissions, [leagueData?.todaysSubmissions]);
  const players = useMemo(() => leagueData?.players, [leagueData?.players]);

  const playersWhoSubmitted = useMemo(() => {
    return todaysSubmissions?.map(submission => submission.playerName) || [];
  }, [todaysSubmissions]);

  const playersWhoDidNotSubmit = useMemo(() => {
    return players?.filter(player => !playersWhoSubmitted.includes(player.user.username)).map(player => player.user.username) || [];
  }, [players, playersWhoSubmitted]);

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
            {todaysSubmissions?.length > 0 ? (
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
              <Body1>No submissions for today.</Body1>
            )}
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Box>
  )
}

export default WhoSubmitted
