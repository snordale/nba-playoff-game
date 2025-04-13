import React from 'react';
import { Body1 } from '../../Body1';
import { Body2 } from '../../Body2';
import { Modal, ModalOverlay, ModalCloseButton, ModalContent, ModalHeader, ModalBody, Stack, Input, Button, Spinner, HStack, Text } from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export const SubmissionModal = ({
  isOpen,
  onClose,
  filteredPlayersByTeam,
  loadingPlayers,
  onSubmit,
  search,
  onSearchChange,
  selectedDate,
  onDateChange
}) => {
  const { data } = useSession();

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} size="xl">
      <ModalOverlay />
      <ModalCloseButton onClick={() => onClose(false)} />
      <ModalContent>
        <ModalHeader>Create Submission for {selectedDate}</ModalHeader>
        <ModalBody pb={6}>
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
                <Body2>Search players playing on {selectedDate}:</Body2>
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
                            {game.teams[0].name} vs {game.teams[1].name} 
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
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
};