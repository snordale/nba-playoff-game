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
interface CalendarDisplayProps {
  submissionsByDate: SubmissionsByDateMap;
  onDateClick: (date: Date) => void; // Define the callback prop type
  currentUserFutureSubmissionStatus?: { [dateKey: string]: boolean };
  currentUserId?: string;
  gameCountsByDate?: { [dateKey: string]: number }; // Add prop type
  // Add other props if needed, e.g., firstDate, lastDate
}

// Updated TileContent helper
const TileContent = ({
  date,
  view,
  submissionsByDate,
  currentUserFutureSubmissionStatus,
  currentUserId,
  gameCountsByDate
}: {
  date: Date;
  view: string;
  submissionsByDate: SubmissionsByDateMap;
  currentUserFutureSubmissionStatus?: { [dateKey: string]: boolean };
  currentUserId?: string;
  gameCountsByDate?: { [dateKey: string]: number };
}) => {
  if (view !== 'month') return null;

  const dateKey = format(date, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const isDayInPast = date < today && !isToday(date);
  const isDayToday = isToday(date);
  const gameCount = gameCountsByDate?.[dateKey];
  const submissions = submissionsByDate[dateKey]; // Past/present submissions for all users

  // Find current user's submission for past/today (Requires submissionsByDate to include userId)
  // const currentUserSubmission = submissions?.find(sub => sub.userId === currentUserId); 
  const topScore = submissions?.[0]?.score; // Example: Get top score 

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
         <>
            {/* Placeholder/Indicator for Past Days */} 
            {(submissions && submissions.length > 0) ? (
              <Text fontSize="xs" color="gray.700" mt={1}> 
                 Top: {topScore ?? 'N/A'} pts 
              </Text>
            ) : (
              gameCount !== undefined && gameCount > 0 ?
                 <Text fontSize="xx-small" color="gray.400" mt={1}>No Submissions</Text> : null
            )}
         </>

      // --- Render Future Day --- 
      ) : (
         currentUserFutureSubmissionStatus?.[dateKey] ?? false ? (
           <Center h="full" w="full" pt={2}>
             <Tooltip label="You submitted for this day" placement="top">
                <Icon as={CheckIcon} color="green.500" boxSize={3} />
             </Tooltip>
           </Center>
         ) : (
           gameCount !== undefined && gameCount > 0 ? (
              <Center h="full" w="full" pt={2}>
                <Tooltip label="Submission needed" placement="top">
                  {/* Use gray MinusIcon for future needed */}
                  <Icon as={MinusIcon} color="gray.400" boxSize={2.5} />
                </Tooltip>
              </Center>
           ) : null // No indicator if no games scheduled
         )
      )}
   </VStack>
 );
};

export const CalendarDisplay: React.FC<CalendarDisplayProps> = ({
  submissionsByDate,
  onDateClick,
  currentUserFutureSubmissionStatus,
  currentUserId,
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
             submissionsByDate={submissionsByDate}
             currentUserFutureSubmissionStatus={currentUserFutureSubmissionStatus}
             currentUserId={currentUserId}
             gameCountsByDate={gameCountsByDate}
          />
        )}
      />
    </Box>
  );
};