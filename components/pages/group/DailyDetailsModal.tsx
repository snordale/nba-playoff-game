import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Stack, Text, Badge, Heading, VStack, HStack, Box
} from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

// Define submission structure expected
interface SubmissionDetail {
  username: string;
  playerName: string;
  score: number | null;
}

interface DailyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null; // YYYY-MM-DD format
  submissions: SubmissionDetail[] | undefined; // Submissions for the selected date
}

export const DailyDetailsModal: React.FC<DailyDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  submissions
}) => {
  if (!isOpen || !selectedDate) {
    return null;
  }

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');
  // Ensure submissions is an array before sorting
  const sortedSubmissions = submissions ? [...submissions].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity)) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{displayDate} - Results</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {sortedSubmissions.length === 0 ? (
            <Text>No submissions were made for this day.</Text>
          ) : (
            <Stack spacing={3}>
              {sortedSubmissions.map((sub, index) => (
                <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg={index === 0 ? 'orange.50' : 'transparent'}>
                   <HStack justify="space-between" align="center">
                      <VStack align="start" spacing={0}>
                         <Text fontWeight="bold">{index + 1}. {sub.username}</Text>
                         <Text fontSize="sm" color="gray.600">Picked: {sub.playerName}</Text>
                      </VStack>
                      <Badge fontSize="md" colorScheme={sub.score === null ? 'gray' : 'orange'} px={3} py={1} borderRadius="full">
                        {sub.score ?? 'N/A'} pts
                      </Badge>
                   </HStack>
                 </Box>
              ))}
            </Stack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};