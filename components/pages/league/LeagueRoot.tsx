'use client';

import { scoreSubmission, scoringKey } from "@/app/utils";
import { Body1 } from "@/components/Body1";
import { useCreateSubmission, useGetLeague, useGetTodaysPlayers } from "@/react-query/queries";
import { Avatar, Button, HStack, IconButton, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverHeader, PopoverTrigger, Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import { InfoIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

export const LeagueRoot = ({ params }) => {
  const { data } = useSession();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { data: leagueData } = useGetLeague({ leagueId: params.leagueId });
  const { data: teams } = useGetTodaysPlayers();
  const { mutate: createSubmission, isSuccess: submitSuccess } = useCreateSubmission();

  const onModalClose = () => {
    setModalOpen(false);
  }

  const onSubmit = ({ playerName, playerImage, teamName }) => {
    createSubmission({
      leagueId: leagueData.league.id,
      playerName,
      playerImage,
      teamName,
    });
  }

  const filteredPlayers = useMemo(() => {
    if (!teams) {
      return [];
    }

    return teams.map((team) => ({
      ...team,
      players: team.players.filter((player) => player.name.toLowerCase().includes(search.toLowerCase()))
    })).filter(team => team.players.length > 0);
  }, [teams, search]);

  useEffect(() => {
    if (submitSuccess) {
      setModalOpen(false);
    }
  }, [submitSuccess]);

  const playersWhoSubmitted = leagueData?.players.filter((submission) => {
    return new Date(submission.createdAt).toLocaleDateString() === new Date().toLocaleDateString();
  });

  const submissionsExcludingToday = leagueData?.submissions.filter((submission) => {
    return new Date(submission.createdAt).toLocaleDateString() !== new Date().toLocaleDateString();
  })

  const usersSubmission = leagueData?.players.find(player => player.user.email === data.user.email).submissions.find(submission => new Date(submission.createdAt).toLocaleDateString() === new Date().toLocaleDateString());

  if (!leagueData) {
    return <Body1>Loading...</Body1>;
  }

  const openPopover = () => {
    setPopoverOpen(true);
  }
  const closePopover = () => {
    setPopoverOpen(false);
  }

  return (
    <Stack>
      <HStack justifyContent='space-between'>
        <Body1>League: {leagueData.league.name}</Body1>
        <IconButton
          icon={<InfoIcon />}
          aria-label="Scoring Key"
          variant="outline"
          size="sm"
          onClick={openPopover}
          m={2}
        />
      </HStack>
      <Body1>Today's Date: {new Date().toLocaleDateString()}</Body1>
      {usersSubmission && (
        <Body1>
          You submitted {usersSubmission.playerName} at {new Date(usersSubmission.createdAt).toLocaleTimeString()}.
        </Body1>
      )}
      <Button colorScheme="purple" onClick={() => setModalOpen(true)}>{usersSubmission ? 'Update' : 'Create'} Submission</Button>
      <Body1 fontWeight={600} pt={4}>Scoreboard</Body1>
      <TableContainer>
        <Table variant='simple'>
          <Thead>
            <Tr>
              <Th>Player</Th>
              <Th isNumeric>Score</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leagueData?.players.map(player => (
              <Tr>
                <Td>
                  {player.user.username}
                </Td>
                <Td isNumeric>
                  {player.score}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <Body1 fontWeight={600} pt={4}>Results</Body1>
      <TableContainer>
        <Table variant='simple'>
          <Thead>
            <Tr>
              <Th>Player</Th>
              <Th isNumeric>P</Th>
              <Th isNumeric>A</Th>
              <Th isNumeric>R</Th>
              <Th isNumeric>S</Th>
              <Th isNumeric>B</Th>
            </Tr>
          </Thead>
          <Tbody>
            {submissionsExcludingToday?.map(submission => {
              const totalPoints = scoreSubmission(submission)
              return (
                <Tr>
                  <Td>{submission.playerName}</Td>
                  <Td isNumeric>{submission.points}</Td>
                  <Td isNumeric>{submission.assists}</Td>
                  <Td isNumeric>{submission.rebounds}</Td>
                  <Td isNumeric>{submission.steals}</Td>
                  <Td isNumeric>{submission.blocks}</Td>
                  <Td isNumeric>{totalPoints}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </TableContainer>
      <IconButton
        icon={<InfoIcon />}
        aria-label="Scoring Key"
        variant="outline"
        size="sm"
        onClick={openPopover}
        m={2}
      />
      <Popover
        isOpen={popoverOpen}
        onClose={closePopover}
        placement="right"
        closeOnBlur={true}
      >
        <PopoverTrigger>
          <Button>Scoring Key</Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader>Scoring Key</PopoverHeader>
          <PopoverBody>
            {Object.entries(scoringKey).map(([key, value], index) => (
              <p key={index}>{value}</p>
            ))}
          </PopoverBody>
        </PopoverContent>
      </Popover>
      <Modal isOpen={modalOpen} onClose={onModalClose}>
        <ModalOverlay />
        <ModalCloseButton onClick={onModalClose} />
        <ModalContent>
          <ModalHeader>Create Submission</ModalHeader>
          <ModalBody>
            <form>
              <Stack>
                <Input
                  value={search}
                  placeholder="Search"
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Stack position='relative' overflow='scroll' height='300px'>
                  {filteredPlayers?.map(({ players, team }) => (
                    <>
                      {players?.map((player) => (
                        <Button
                          size='md'
                          colorScheme='purple'
                          flexShrink={0}
                          key={player}
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
                </Stack>
              </Stack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack >
  );
}