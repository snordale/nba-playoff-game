// components/pages/group/CalendarDisplay.tsx
import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from '@/constants';
import { Badge, Box, Text, Tooltip, VStack } from '@chakra-ui/react';
import { format, isToday, startOfDay } from 'date-fns';
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling
import { type SubmissionView, type UserSubmissionMap } from '@/utils/submission-utils';

// Define structure for group members
export interface GroupMember {
  username: string;
  // Add other relevant member details if needed, e.g., id
}

interface CalendarDisplayProps {
  onDateClick: (date: Date) => void;
  currentUserSubmissionsMap?: UserSubmissionMap;
  gameCountsByDate?: { [dateKey: string]: number };
  submissionsByDate?: { [dateKey: string]: SubmissionView[] };
  groupMembers: GroupMember[]; // Add group members prop
}

// Updated TileContent helper props
interface TileContentProps {
  date: Date;
  view: string;
  currentUserSubmissionsMap?: UserSubmissionMap;
  gameCountsByDate?: { [dateKey: string]: number };
  submissionsByDate?: { [dateKey: string]: SubmissionView[] };
  groupMembers: GroupMember[]; // Add group members prop
}

// Updated TileContent helper
const TileContent = ({
  date,
  view,
  currentUserSubmissionsMap,
  gameCountsByDate,
  submissionsByDate,
  groupMembers // Destructure groupMembers
}: TileContentProps) => { // Use the interface
  if (view !== 'month') return null;

  const dateKey = format(date, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const isDayInPastOrToday = date <= today;
  const isDayToday = isToday(date);
  const gameCount = gameCountsByDate?.[dateKey];
  const userSubmission = currentUserSubmissionsMap?.[dateKey];
  const allSubmissions = submissionsByDate?.[dateKey] || [];

  // Create a map for quick lookup of submission status by username for the current date
  // A user is considered to have submitted if they appear in allSubmissions AND have a truthy playerName
  const submissionStatusMap = new Map<string, boolean>();
  allSubmissions.forEach(sub => {
    if (sub.playerName) { // Check if playerName is truthy (not null, undefined, or empty string)
      submissionStatusMap.set(sub.username, true);
    }
    // If playerName is falsy, we don't explicitly set to false,
    // because the default lookup later will be false anyway.
    // We only care about positively identifying who *has* submitted.
  });

  return (
    <VStack spacing={0.5} align="stretch" mt={1} width='100%' overflow="hidden" maxHeight="110px">
      {/* Display Game Count */}
      {gameCount !== undefined && gameCount > 0 && (
        <Text fontSize='2xs'>
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
                  <Text fontSize="2xs" color="gray.600" isTruncated noOfLines={1}>
                    {submission.username}: {submission ? submission.score : 'N/A'}
                  </Text>
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
            {/* Iterate over all group members */}
            {groupMembers.map((member, index) => {
              // Check if this member has made a valid submission for this date
              const hasSubmitted = submissionStatusMap.get(member.username) ?? false;
              return (
                <Text
                  key={index}
                  fontSize="2xs"
                  color={hasSubmitted ? "green.500" : "orange.500"} // Green if submitted, orange if not
                  isTruncated
                  noOfLines={1}
                >
                  {member.username}
                </Text>
              );
            })}
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
  submissionsByDate,
  groupMembers // Accept groupMembers prop
}) => {
  // Ensure groupMembers is always an array, even if undefined is passed.
  const safeGroupMembers = groupMembers || [];

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
          /* Default desktop height */
          height: 120px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left; /* Ensure text aligns left */
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
          overflow: hidden; /* Hide overflow on desktop */
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
          background: #FFF5EB !important; /* orange.50 for today */
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

        /* --- Mobile Styles --- */
        @media (max-width: 768px) {
          .react-calendar {
            padding: 2px;
          }
          .react-calendar__tile {
             height: auto; /* Let content define height */
             min-height: 100px; /* Ensure minimum tappable area */
             padding: 3px;
             overflow: visible; /* Allow content to slightly overflow if needed */
          }
          /* Optional: Adjust font sizes within tiles for mobile if needed */
          .react-calendar__tile .chakra-text,
          .react-calendar__tile .chakra-badge {
             /* Example: Slightly larger fonts for mobile */
             /* font-size: 10px; */
          }
        }
      `}</style>
      <Calendar
        defaultActiveStartDate={new Date()}
        maxDate={new Date(PLAYOFF_END_DATE)}
        minDate={new Date(PLAYOFF_START_DATE)}
        onClickDay={onDateClick}
        tileContent={({ date, view }) => (
          <TileContent
            date={date}
            view={view}
            currentUserSubmissionsMap={currentUserSubmissionsMap}
            gameCountsByDate={gameCountsByDate}
            submissionsByDate={submissionsByDate}
            groupMembers={safeGroupMembers} // Pass safe groupMembers down
          />
        )}
      />
    </Box>
  );
};