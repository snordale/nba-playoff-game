import React from 'react';
import { Box, Stack, Text, Heading, SimpleGrid, Card, CardBody, CardHeader, Badge, HStack } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

// Define props type
interface DailyPicksDisplayProps {
  sortedDates: string[];
  submissionsByDate: {
    [dateKey: string]: Array<{
      username: string;
      playerName: string;
      score: number | null;
    }>
  };
}

export const DailyPicksDisplay: React.FC<DailyPicksDisplayProps> = ({ sortedDates, submissionsByDate }) => {
  if (!sortedDates || sortedDates.length === 0) {
    return <Text mt={4}>No past picks to display yet.</Text>;
  }

  return (
    <Stack spacing={6} mt={6}>
      <Heading size="md" borderBottomWidth="1px" pb={2}>Daily Results</Heading>
      {sortedDates.map((dateKey) => {
        const submissions = submissionsByDate[dateKey];
        // Format date for display (e.g., "Mon, Apr 15")
        const displayDate = format(parseISO(dateKey), 'EEE, MMM d');

        return (
          <Box key={dateKey} borderWidth="1px" borderRadius="md" p={4}>
            <Heading size="sm" mb={3}>{displayDate}</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {submissions.map((sub, index) => (
                <Card key={`${dateKey}-${sub.username}`} variant="outline" size="sm">
                  <CardHeader pb={1}>
                     <HStack justify="space-between">
                         <Text fontWeight="semibold" fontSize="sm">
                           {index + 1}. {sub.username}
                         </Text>
                         <Badge colorScheme={sub.score === null ? 'gray' : 'orange'}>
                           {sub.score ?? 'N/A'} pts
                         </Badge>
                      </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <Text fontSize="xs" color="gray.600">Picked: {sub.playerName}</Text>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        );
      })}
    </Stack>
  );
};