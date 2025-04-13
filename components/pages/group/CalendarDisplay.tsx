// components/pages/group/CalendarDisplay.tsx
import React from 'react';
import { Box, Stack, Text, Badge, VStack, Tooltip, HStack } from '@chakra-ui/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling
import { format, parseISO, startOfDay } from 'date-fns';

// Define structure for submissions data passed as props
interface SubmissionForDate {
  username: string;
  playerName: string;
  score: number | null;
}
interface SubmissionsByDateMap {
  [dateKey: string]: SubmissionForDate[];
}
interface CalendarDisplayProps {
  submissionsByDate: SubmissionsByDateMap;
  onDateClick: (date: Date) => void; // Define the callback prop type
  // Add other props if needed, e.g., firstDate, lastDate
}

// Helper to format tile content
const TileContent = ({ date, view, submissionsByDate }: { date: Date; view: string; submissionsByDate: SubmissionsByDateMap }) => {
  // Only render content for month view
  if (view !== 'month') {
    return null;
  }

  const dateKey = format(date, 'yyyy-MM-dd'); // Get the key for this date
  const submissions = submissionsByDate[dateKey];

  if (!submissions || submissions.length === 0) {
    return null; // No submissions for this day
  }

  // Sort by score for display (might be already sorted)
  const sortedSubmissions = [...submissions].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));

  return (
    <VStack spacing={0.5} align="stretch" mt={1} overflow="hidden" maxHeight="60px">
      {sortedSubmissions.slice(0, 3).map((sub, index) => ( // Show top 3 picks per day
        <Tooltip key={index} label={`${sub.username}: ${sub.playerName} (${sub.score ?? 'N/A'} pts)`} placement="top" fontSize="xs">
          <HStack justify="space-between" w="full">
            <Text fontSize="xx-small" isTruncated maxWidth="calc(100% - 30px)">
              <Badge variant="solid" colorScheme="gray" mr={1} fontSize="xx-small">{index + 1}</Badge>
              {sub.username}
            </Text>
            <Badge colorScheme={sub.score === null ? 'gray' : 'orange'} fontSize="xx-small" flexShrink={0}>
              {sub.score ?? 'N/A'}
            </Badge>
          </HStack>
        </Tooltip>
      ))}
      {sortedSubmissions.length > 3 && (
         <Text fontSize="xx-small" textAlign="center" color="gray.500">...</Text>
      )}
    </VStack>
  );
};

export const CalendarDisplay: React.FC<CalendarDisplayProps> = ({ submissionsByDate, onDateClick }) => {
  // Determine range for calendar (optional, could make dynamic)
  // const activeStartDate = ...
  // const maxDate = ...
  const minDate = new Date('2025-04-19')

  return (
    <Box className="calendar-container" mt={6} mb={6}>
      {/* Apply some custom styles potentially */}
      <style>{`
        .react-calendar {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 5px;
          background: white;
        }
        .react-calendar__tile {
          height: 90px; /* Adjust tile height */
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 4px;
        }
         .react-calendar__tile--now {
          background: #ffffe0 !important; /* Highlight today */
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #ccc; /* Dim days from other months */
        }
        .react-calendar__navigation button {
            color: #e67e22; /* Orange theme */
            min-width: 44px;
            background: none;
            font-size: 16px;
            margin-top: 8px;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
            background-color: #f3f3f3;
        }
      `}</style>
      <Calendar
        // Configure calendar props as needed
        // activeStartDate={activeStartDate}
        // maxDate={maxDate}
        minDate={minDate}
        onClickDay={onDateClick}
        tileContent={({ date, view }) => (
          <TileContent date={date} view={view} submissionsByDate={submissionsByDate} />
        )}
      />
    </Box>
  );
};