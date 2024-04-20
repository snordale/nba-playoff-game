import { Body1 } from '@/components/Body1';
import { Body2 } from '@/components/Body2';
import { Modal, ModalOverlay, ModalCloseButton, ModalContent, ModalHeader, ModalBody, Stack, Input, Button, Avatar, Spinner, HStack } from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export const SubmissionModal = ({
  isOpen,
  onClose,
  futureSubmissions,
  filteredPlayersByTeam,
  loadingPlayers,
  onSubmit,
  search,
  onSearchChange,
  selectedDate,
  onDateChange
}) => {
  const { data } = useSession();
  const playerUpcomingSubmissions = futureSubmissions.filter(submission => submission.player.user.email === data?.user?.email)

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)}>
      <ModalOverlay />
      <ModalCloseButton onClick={() => onClose(false)} />
      <ModalContent>
        <ModalHeader>Create Submission</ModalHeader>
        <ModalBody>
          <Stack>
            <Body1>
              Upcoming submissions:
            </Body1>
            <Stack>
              {playerUpcomingSubmissions.map((submission, index) => (
                <Body2 key={index}>
                  {new Date(submission.date).toDateString()} {submission.playerName} - {submission.teamName}
                </Body2>
              ))}
            </Stack>
          </Stack>
          <form>
            <Stack gap={3}>
              <Stack gap={1}>
                <Body2>Select a date to submit for:</Body2>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  placeholder="Select date"
                />
              </Stack>
              <Stack gap={1}>
                <Body2>Search players:</Body2>
                <Input
                  value={search}
                  placeholder="Search players"
                  onChange={e => onSearchChange(e.target.value)}
                />
              </Stack>
              <Stack position='relative' overflow='scroll' height='300px'>
                {loadingPlayers ? (
                  <HStack py={8} justifyContent='center'>
                    <Spinner />
                  </HStack>
                ) : (
                  <>
                    {filteredPlayersByTeam?.map(({ players, team }) => (
                      <>
                        {players?.map((player) => (
                          <Button
                            size='md'
                            colorScheme='purple'
                            flexShrink={0}
                            key={`${player.name}-${player.image}`}
                            isDisabled={player.alreadySubmitted}
                            onClick={() => onSubmit({
                              teamName: team,
                              playerName: player.name,
                              playerImage: player.image
                            })}
                            justifyContent='flex-start'
                            gap={2}
                          >
                            <Avatar src={player.image} size='sm' />
                            {player.name} – {team}
                          </Button>
                        ))}
                      </>
                    ))}
                  </>
                )}
              </Stack>
            </Stack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
};