// components/pages/group/CalendarDisplay.tsx
import React from 'react';
import { Box, Stack, Text, Badge, VStack, Tooltip, HStack, Center, Icon } from '@chakra-ui/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling
import { format, parseISO, startOfDay, isToday } from 'date-fns';
import { CheckIcon, CloseIcon, MinusIcon } from '@chakra-ui/icons';

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
}

// Updated TileContent helper
const TileContent = ({
  date,
  view,
  currentUserSubmissionsMap,
  gameCountsByDate
}: {
  date: Date;
  view: string;
  currentUserSubmissionsMap?: CurrentUserSubmissionsMap;
  gameCountsByDate?: { [dateKey: string]: number };
}) => {
  if (view !== 'month') return null;

  const dateKey = format(date, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const isDayInPast = date < today && !isToday(date);
  const isDayToday = isToday(date);
  const gameCount = gameCountsByDate?.[dateKey];
  const userSubmission = currentUserSubmissionsMap?.[dateKey]; // Get user's submission for this date

  return (
    <VStack spacing={0.5} align="stretch" mt={1} overflow="hidden" maxHeight="80px"> 
       {/* Display Game Count */} 
       {gameCount !== undefined && gameCount > 0 && (
           <Text fontSize="9px" color="gray.500" textAlign="right" lineHeight="1" w="full">
               {gameCount} Game{gameCount > 1 ? 's' : ''}
           </Text>
       )}

      {/* --- Render Past or Present Day --- */} 
      {(isDayInPast || isDayToday) ? (
          // Check if the current user submitted for this day
          userSubmission ? (
            // User submitted: Show Player + Score
            <Tooltip label={`${userSubmission.playerName} (${userSubmission.score ?? 'N/A'} pts)`} placement="top" fontSize="xs">
                 <VStack align="stretch" spacing={0} mt={1}>
                    <Text fontSize="xs" color="blue.600" fontWeight="medium" isTruncated noOfLines={1}>
                        {userSubmission.playerName}
                     </Text>
                    <Badge alignSelf="flex-end" colorScheme={userSubmission.score === null ? 'gray' : 'orange'} fontSize="xx-small" px={1.5}>
                       {userSubmission.score ?? 'N/A'} pts
                     </Badge>
                  </VStack>
             </Tooltip>
          ) : (
             // User did NOT submit for this past/present day with games
             gameCount !== undefined && gameCount > 0 ? 
               <Text fontSize="xx-small" color="gray.400" mt={1}>No Submission</Text> : null 
          )
       ) : (
          // --- Render Future Day --- 
          userSubmission ? ( // Equivalent to checking currentUserFutureSubmissionStatus[dateKey]
            <Center h="full" w="full" pt={1}> {/* Adjust padding */} 
              <Tooltip label="You submitted for this day" placement="top">
                 <Icon as={CheckIcon} color="green.500" boxSize={3} />
              </Tooltip>
            </Center>
          ) : (
            gameCount !== undefined && gameCount > 0 ? (
               <Center h="full" w="full" pt={1}> {/* Adjust padding */} 
                 <Tooltip label="Submission needed" placement="top">
                   <Icon as={MinusIcon} color="gray.400" boxSize={2.5} />
                 </Tooltip>
               </Center>
            ) : null 
          )
       )}
   </VStack>
 );
};

export const CalendarDisplay: React.FC<CalendarDisplayProps> = ({
  onDateClick,
  currentUserSubmissionsMap,
  gameCountsByDate
}) => {
  return (
    <Box width="100%" mt={6} mb={6}>
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
        maxDate={new Date('2025-07-01')}
        minDate={new Date('2025-04-19')}
        onClickDay={onDateClick}
        tileContent={({ date, view }) => (
          <TileContent 
             date={date} 
             view={view} 
             currentUserSubmissionsMap={currentUserSubmissionsMap}
             gameCountsByDate={gameCountsByDate}
          />
        )}
      />
    </Box>
  );
};