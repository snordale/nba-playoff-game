import { Button, HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, Stack, Text, Divider, Box, Grid, VStack, useToast } from '@chakra-ui/react';
import { Body2 } from '../../Body2';
import { format, parseISO } from 'date-fns';
import { useGetGames } from '@/react-query/queries';
import { useState } from 'react';
import { CheckCircleIcon } from '@chakra-ui/icons';

export const SubmissionModal = ({
  isOpen,
  onClose,
  filteredPlayersByTeam,
  loadingPlayers,
  onSubmit,
  search,
  onSearchChange,
  selectedDate,
  currentSubmission,
  previouslySubmittedPlayerIds,
}) => {
  const displayDate = selectedDate ? format(parseISO(selectedDate), 'MMMM d, yyyy') : 'Selected Date';
  const { data: games, isLoading: loadingGames } = useGetGames({ date: selectedDate });
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getStatusColor(status: string) {
    if (status === 'STATUS_SCHEDULED') {
      return 'green.600';
    }
    if (status === 'STATUS_IN_PROGRESS') {
      return 'orange.500';
    }
    if (status === 'STATUS_FINAL') {
      return 'red.500';
    }
  }

  const handleSubmit = async (submissionData: { gameId: string; playerId: string }) => {
    setIsSubmitting(true);
    try {
      await onSubmit(submissionData);

      let playerName = 'Player';
      filteredPlayersByTeam?.forEach(game => {
        game.teams?.forEach(team => {
          const player = team.players?.find(p => p.id === submissionData.playerId);
          if (player) playerName = player.name;
        });
      });

      toast({
        title: 'Submission Successful',
        description: `You picked ${playerName}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose(true);
    } catch (error: any) {
      console.error("Submission failed:", error);
      toast({
        title: 'Submission Failed',
        description: error?.message || 'Could not submit your pick. The game might have started, or an error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} size="xl">
      <ModalOverlay />
      <ModalCloseButton onClick={() => onClose(false)} />
      <ModalContent>
        <ModalHeader>Create Submission for {displayDate}</ModalHeader>
        <ModalBody pb={6}>
          <Stack gap={4}>
            {/* Games Section */}
            <Stack gap={2}>
              {loadingGames ? (
                <HStack py={2} justifyContent='center'>
                  <Spinner color="orange.500" size="sm" />
                </HStack>
              ) : games && games.length > 0 ? (
                <Grid gap={2} gridTemplateColumns={['1fr 1fr', '1fr 1fr', '1fr 1fr 1fr 1fr']}>
                  {games.map((game) => (
                    <Box key={game.id} p={2} borderWidth="1px" borderRadius="md">
                      <HStack justify="space-between" alignItems='flex-start'>
                        <VStack alignItems='flex-start'>
                          <Text fontSize="xs" color="gray.600">
                            {game.homeTeam.abbreviation} - {game.homeScore}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {game.awayTeam.abbreviation} - {game.awayScore}
                          </Text>
                        </VStack>
                        <Text fontSize="xs" color={getStatusColor(game.status)}>
                          {format(game.date, 'h:mm a')}
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </Grid>
              ) : (
                <Text color="gray.500">No games scheduled for this date.</Text>
              )}
            </Stack>

            {/* Players Section */}
            <Stack gap={2}>
              <Input
                value={search}
                placeholder="Search players..."
                onChange={e => onSearchChange(e.target.value)}
              />
              {currentSubmission && (
                <Text
                  fontSize="sm"
                  fontWeight="semibold" color="orange.600" textAlign="center" p={2} borderWidth={1} borderRadius="md" borderColor="orange.600">
                  {currentSubmission.playerName}
                </Text>
              )}
            </Stack>
            <Stack
              position='relative'
              overflowY='auto'
              maxH='400px'
              borderWidth={1}
              borderColor="gray.200"
              borderRadius="md"
              p={2}
            >
              {loadingPlayers ? (
                <HStack py={8} justifyContent='center'>
                  <Spinner color="orange.500" />
                </HStack>
              ) : (
                <>
                  {filteredPlayersByTeam && filteredPlayersByTeam.length > 0 ? (
                    filteredPlayersByTeam.map((game) => (
                      <Stack key={game.gameId} pl={2} mb={2} spacing={1}>
                        <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                          {game.teams?.[0]?.name ?? 'Team A'} vs {game.teams?.[1]?.name ?? 'Team B'}
                          &nbsp;({new Date(game.gameDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                        </Text>
                        {game.teams?.map((team) => (
                          <Stack key={team.teamId} pl={2} spacing={0.5}>
                            {team.players?.map((player) => {
                              const isCurrentPick = currentSubmission?.playerId === player.id || currentSubmission?.playerName === player.name;
                              const isPreviouslySubmitted = previouslySubmittedPlayerIds?.includes(player.id) && !isCurrentPick;

                              return (
                                <Button
                                  size='sm'
                                  variant={isCurrentPick ? 'solid' : 'ghost'}
                                  colorScheme='orange'
                                  flexShrink={0}
                                  key={player.id}
                                  isDisabled={isPreviouslySubmitted || (player.alreadySubmitted && !isCurrentPick) || isSubmitting}
                                  isLoading={isSubmitting && currentSubmission?.playerId === player.id}
                                  onClick={() => handleSubmit({
                                    gameId: game.gameId,
                                    playerId: player.id
                                  })}
                                  justifyContent='space-between'
                                  gap={2}
                                  fontWeight="normal"
                                  _disabled={{
                                    opacity: isPreviouslySubmitted ? 0.5 : 1,
                                    cursor: isPreviouslySubmitted ? 'not-allowed' : 'pointer',
                                    textDecoration: isPreviouslySubmitted ? 'line-through' : 'none'
                                  }}
                                >
                                  <Text>{player.name} – {team.abbreviation}</Text>
                                  <HStack spacing={2}>
                                    {isPreviouslySubmitted && 
                                      <Text as="span" fontSize="xs" color="gray.500">(Already Used)</Text>
                                    }
                                    {isCurrentPick && (
                                      <CheckCircleIcon color="white" boxSize={4} />
                                    )}
                                  </HStack>
                                </Button>
                              );
                            })}
                          </Stack>
                        ))}
                      </Stack>
                    ))
                  ) : (
                    <Text textAlign="center" color="gray.500" p={4}>
                      No players found for this date or search.
                    </Text>
                  )}
                </>
              )}
            </Stack>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
};