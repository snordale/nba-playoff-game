// components/pages/group/CalendarDisplay.tsx
import { CheckIcon, MinusIcon } from '@chakra-ui/icons';
import { Badge, Box, Center, Icon, Text, Tooltip, VStack } from '@chakra-ui/react';
import { format, isToday, startOfDay } from 'date-fns';
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling

// Define structure for submissions data passed as props
interface SubmissionForDate {
  username: string;
  playerName: string;
  score: number | null;
}
interface SubmissionsByDateMap {
  [dateKey: string]: SubmissionForDate[];
}

// Define structure for the user submission map
interface CurrentUserSubmission {
  playerName: string;
  score: number | null;
  isFuture: boolean;
}
interface CurrentUserSubmissionsMap {
  [dateKey: string]: CurrentUserSubmission;
}

interface CalendarDisplayProps {
  onDateClick: (date: Date) => void;
  currentUserSubmissionsMap?: CurrentUserSubmissionsMap;
  gameCountsByDate?: { [dateKey: string]: number };
  submissionsByDate?: SubmissionsByDateMap;
}

// Updated TileContent helper
const TileContent = ({
  date,
  view,
  currentUserSubmissionsMap,
  gameCountsByDate,
  submissionsByDate
}: {
  date: Date;
  view: string;
  currentUserSubmissionsMap?: CurrentUserSubmissionsMap;
  gameCountsByDate?: { [dateKey: string]: number };
  submissionsByDate?: SubmissionsByDateMap;
}) => {
  if (view !== 'month') return null;

  const dateKey = format(date, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const isDayInPastOrToday = date <= today;
  const isDayToday = isToday(date);
  const gameCount = gameCountsByDate?.[dateKey];
  const userSubmission = currentUserSubmissionsMap?.[dateKey];
  const allSubmissions = submissionsByDate?.[dateKey] || [];

  console.log(`Rendering date ${dateKey}:`, {
    isDayInPastOrToday,
    gameCount,
    allSubmissions
  });

  return (
    <VStack spacing={0.5} align="stretch" mt={1} overflow="hidden" maxHeight="110px">
      {/* Display Game Count */}
      {gameCount !== undefined && gameCount > 0 && (
        <Text fontSize="9px" color="gray.500" textAlign="right" lineHeight="1" w="full">
          {gameCount} Game{gameCount > 1 ? 's' : ''}
        </Text>
      )}

      {/* --- Render Past or Present Day --- */}
      {(isDayInPastOrToday) ? (
        allSubmissions.length > 0 ? (
          // Show all submissions for this day
          <VStack align="stretch" spacing={0.5} mt={1}>
            {allSubmissions.map((submission, index) => (
              <Tooltip 
                key={index}
                label={`${submission.username}: ${submission.playerName} (${submission.score ?? 'N/A'} pts)`} 
                placement="top" 
                fontSize="xs"
              >
                <VStack align="stretch" spacing={0}>
                  <Text fontSize="9px" color="gray.600" isTruncated noOfLines={1}>
                    {submission.username}: {submission.playerName}
                  </Text>
                  <Badge alignSelf="flex-end" colorScheme={submission.score === null ? 'gray' : 'orange'} fontSize="8px" px={1}>
                    {submission.score ?? 'N/A'} pts
                  </Badge>
                </VStack>
              </Tooltip>
            ))}
          </VStack>
        ) : (
          // No submissions for this past/present day with games
          gameCount !== undefined && gameCount > 0 ?
            <Text fontSize="xx-small" color="gray.400" mt={1}>No Submissions</Text> : null
        )
      ) : (
        // --- Render Future Day --- 
        gameCount !== undefined && gameCount > 0 ? (
          <VStack align="stretch" spacing={0.5} mt={1}>
            {allSubmissions.map((submission, index) => (
              <Text key={index} fontSize="9px" color={submission.playerName ? "green.500" : "gray.500"} isTruncated noOfLines={1}>
                {submission.username}: {submission.playerName ? "PICK IN" : "NO PICK"}
              </Text>
            ))}
          </VStack>
        ) : null
      )}
    </VStack>
  );
};

export const CalendarDisplay: React.FC<CalendarDisplayProps> = ({
  onDateClick,
  currentUserSubmissionsMap,
  gameCountsByDate,
  submissionsByDate
}) => {
  return (
    <Box width="100%">
      {/* Apply some custom styles potentially */}
      <style>{`
        .react-calendar {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 5px;
          background: white;
          width: 100%;
        }
        .react-calendar__tile {
          height: 140px; /* INCREASED tile height */
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
            /* Use Chakra theme color token for light orange */
            background-color: var(--chakra-colors-orange-50); 
        }
        .react-calendar__tile--active { 
             /* Style for the selected day, if needed */
            background-color: var(--chakra-colors-orange-100) !important; 
            color: var(--chakra-colors-orange-800); 
         } 
         .react-calendar__tile--now {
          background: #FFF5EB !important; /* orange.50 for today */
          font-weight: bold;
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
        defaultActiveStartDate={new Date()}
        maxDate={new Date('2025-07-01')}
        minDate={new Date('2025-04-14')}
        onClickDay={onDateClick}
        tileContent={({ date, view }) => (
          <TileContent
            date={date}
            view={view}
            currentUserSubmissionsMap={currentUserSubmissionsMap}
            gameCountsByDate={gameCountsByDate}
            submissionsByDate={submissionsByDate}
          />
        )}
      />
    </Box>
  );
};