// components/pages/group/CalendarDisplay.tsx
import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from '@/constants';
import { Box, Text, VStack } from '@chakra-ui/react';
import { format, isToday, startOfDay } from 'date-fns';
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useGroup } from './GroupContext';

interface TileContentProps {
  date: Date;
  view: string;
}

const TileContent = ({ date, view }: TileContentProps) => {
  const {
    gameCountsByDate,
    submissionsByDate,
    leaderboardUsers
  } = useGroup();

  if (view !== 'month') return null;

  const dateKey = format(date, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const isPast = date < today;
  const gameCount = gameCountsByDate?.[dateKey] ?? 0;
  const submissionsForThisDate = submissionsByDate?.[dateKey] ?? [];

  if (gameCount === 0) return null;

  return (
    <VStack spacing={0.5} align="stretch" mt={1} width='100%'>
      {/* Game Count */}
      <Text fontSize='2xs' color="gray.600">
        {gameCount} Game{gameCount > 1 ? 's' : ''}
      </Text>

      {/* Submissions */}
      {isPast ? (
        // Past or Today: Show scores
        submissionsForThisDate.map((sub, i) => (
          <Text key={i} fontSize="2xs" color="green.600" isTruncated>
            {sub.username}: {sub.score ?? 'N/A'}
          </Text>
        ))
      ) : (
        // Future: Show who has picked
        leaderboardUsers?.map((member, i) => {
          const submission = submissionsForThisDate.find(sub => sub.userId === member.userId);
          const hasPicked = submission?.gameStatus === 'STATUS_SCHEDULED' &&
            submission?.gameStartsAt &&
            new Date(submission.gameStartsAt) > new Date();
          return (
            <Text
              key={i}
              fontSize="2xs"
              color={hasPicked ? "green.500" : "gray.400"}
              fontWeight={hasPicked ? "medium" : "normal"}
              isTruncated
            >
              {member.username}
            </Text>
          );
        })
      )}
    </VStack>
  );
};

export const CalendarDisplay = () => {
  const { handleDayClick } = useGroup();

  return (
    <Box width="100%">
      <style>{`
        .react-calendar {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 5px;
          background: white;
          width: 100%;
        }
        .react-calendar__tile {
          height: 120px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
          overflow: hidden;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
            background-color: var(--chakra-colors-orange-50);
        }
        .react-calendar__tile--active {
            background-color: var(--chakra-colors-orange-100) !important;
            color: var(--chakra-colors-orange-800);
        }
        .react-calendar__tile--now {
          background: #FFF5EB !important;
          font-weight: bold;
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #ccc;
        }
        .react-calendar__navigation button {
            color: #e67e22;
            min-width: 44px;
            background: none;
            font-size: 16px;
            margin-top: 8px;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
            background-color: #f3f3f3;
        }

        @media (max-width: 768px) {
          .react-calendar {
            padding: 2px;
          }
          .react-calendar__tile {
             height: auto;
             min-height: 100px;
             padding: 3px;
          }
        }
      `}</style>
      <Calendar
        defaultActiveStartDate={new Date()}
        maxDate={new Date(PLAYOFF_END_DATE)}
        minDate={new Date(PLAYOFF_START_DATE)}
        onClickDay={handleDayClick}
        tileContent={({ date, view }) => (
          <TileContent
            date={date}
            view={view}
          />
        )}
      />
    </Box>
  );
};