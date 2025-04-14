import { Button, HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Spinner, Stack, Text, Divider, Box } from '@chakra-ui/react';
import { Body2 } from '../../Body2';
import { format, parseISO } from 'date-fns';
import { useGetGames } from '@/react-query/queries';

export const SubmissionModal = ({
  isOpen,
  onClose,
  filteredPlayersByTeam,
  loadingPlayers,
  onSubmit,
  search,
  onSearchChange,
  selectedDate,
}) => {
  const displayDate = selectedDate ? format(parseISO(selectedDate), 'MMMM d, yyyy') : 'Selected Date';
  const { data: games, isLoading: loadingGames } = useGetGames({ date: selectedDate });

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
              <Body2 fontWeight="semibold">Games</Body2>
              {loadingGames ? (
                <HStack py={2} justifyContent='center'>
                  <Spinner color="orange.500" size="sm" />
                </HStack>
              ) : games && games.length > 0 ? (
                <Stack gap={2}>
                  {games.map((game) => (
                    <Box key={game.id} p={3} borderWidth="1px" borderRadius="md">
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.600">
                          {game.homeTeam.name} vs {game.awayTeam.name}
                        </Text>
                        <Text fontSize="sm" color={getStatusColor(game.status)}>
                          {format(game.date, 'h:mm a')}
                        </Text>
                      </HStack>
                      {game.homeScore !== null && game.awayScore !== null && (
                        <Text fontSize="sm" color="gray.700" mt={1}>
                          {game.homeTeam.abbreviation} {game.homeScore} - {game.awayScore} {game.awayTeam.abbreviation}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Text color="gray.500">No games scheduled for this date.</Text>
              )}
            </Stack>

            <Divider />

            {/* Players Section */}
            <Stack gap={1}>
              <Body2>Search players playing on {displayDate}:</Body2>
              <Input
                value={search}
                placeholder="Search players..."
                onChange={e => onSearchChange(e.target.value)}
              />
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
                          ({new Date(game.gameDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                        </Text>
                        {game.teams?.map((team) => (
                          <Stack key={team.teamId} pl={2} spacing={0.5}>
                            {team.players?.map((player) => (
                              <Button
                                size='sm'
                                variant='ghost'
                                colorScheme='orange'
                                flexShrink={0}
                                key={player.id}
                                isDisabled={player.alreadySubmitted}
                                onClick={() => onSubmit({
                                  gameId: game.gameId,
                                  playerId: player.id
                                })}
                                justifyContent='flex-start'
                                gap={2}
                                fontWeight="normal"
                                _disabled={{ opacity: 0.5, cursor: 'not-allowed', textDecoration: 'line-through' }}
                              >
                                {player.name} – {team.abbreviation}
                                {player.alreadySubmitted && <Text as="span" fontSize="xs" color="gray.500" ml={2}>(Submitted)</Text>}
                              </Button>
                            ))}
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