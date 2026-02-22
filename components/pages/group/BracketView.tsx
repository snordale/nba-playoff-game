"use client";

import {
  Badge,
  Box,
  Button,
  HStack,
  NativeSelectRoot,
  NativeSelectField,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";
import { queryClient, useCreateSeriesPick } from "@/react-query/queries";
import { toaster } from "@/lib/toaster";
import { useGroup } from "./GroupContext";
import { Leaderboard } from "./Leaderboard";

const ROUND_ORDER = ["FIRST_ROUND", "SEMIFINALS", "CONFERENCE_FINALS", "FINALS"] as const;

const ROUND_LABELS: Record<string, string> = {
  FIRST_ROUND: "First Round",
  SEMIFINALS: "Semifinals",
  CONFERENCE_FINALS: "Conference Finals",
  FINALS: "Finals",
};

interface SeriesData {
  id: string;
  round: string;
  conference: string | null;
  highSeedTeam: { id: string; name: string; abbreviation: string };
  lowSeedTeam: { id: string; name: string; abbreviation: string };
  highSeedWins: number;
  lowSeedWins: number;
  winnerTeamId: string | null;
  winnerWins: number | null;
  loserWins: number | null;
  firstGameStartsAt: string | null;
}

interface SeriesCardProps {
  series: SeriesData;
  currentPick?: { winnerTeamId: string; gamesCount: number };
  groupId: string;
  currentGroupUserId?: string;
}

function SeriesCard({ series, currentPick, groupId, currentGroupUserId }: SeriesCardProps) {
  const [winnerTeamId, setWinnerTeamId] = useState(currentPick?.winnerTeamId ?? "");
  const [gamesCount, setGamesCount] = useState(currentPick?.gamesCount ?? 4);

  useEffect(() => {
    setWinnerTeamId(currentPick?.winnerTeamId ?? "");
    setGamesCount(currentPick?.gamesCount ?? 4);
  }, [currentPick?.winnerTeamId, currentPick?.gamesCount]);

  const { mutateAsync: createPick, isPending } = useCreateSeriesPick();

  const now = new Date();
  const isLocked = !!series.firstGameStartsAt && new Date(series.firstGameStartsAt) <= now;
  const isComplete = !!series.winnerTeamId;
  const isFinals = series.round === "FINALS";

  const lockTimeLabel = series.firstGameStartsAt
    ? `Locks ${formatInTimeZone(new Date(series.firstGameStartsAt), "America/New_York", "MMM d, h:mm a 'ET'")}`
    : null;

  const winnerAbbr = isComplete
    ? (series.winnerTeamId === series.highSeedTeam.id
        ? series.highSeedTeam.abbreviation
        : series.lowSeedTeam.abbreviation)
    : null;

  const pickedAbbr = currentPick
    ? (currentPick.winnerTeamId === series.highSeedTeam.id
        ? series.highSeedTeam.abbreviation
        : series.lowSeedTeam.abbreviation)
    : null;

  const handleSave = async () => {
    if (!winnerTeamId) {
      toaster.create({ title: "Select a winner", status: "warning", duration: 3000 });
      return;
    }
    try {
      await createPick({ groupId, seriesId: series.id, winnerTeamId, gamesCount });
      toaster.create({ title: "Pick saved", status: "success", duration: 2000 });
      queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
    } catch (err: unknown) {
      toaster.create({
        title: "Failed to save pick",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 4000,
      });
    }
  };

  return (
    <Box
      p={4}
      borderWidth={1}
      borderRadius="md"
      borderColor={isLocked ? "gray.200" : "orange.200"}
      bg="white"
    >
      {/* Round + conference + lock status */}
      <HStack mb={3} justify="space-between" flexWrap="wrap" gap={1}>
        <HStack gap={1}>
          <Badge colorScheme="orange">{ROUND_LABELS[series.round] ?? series.round}</Badge>
          {series.conference && (
            <Badge variant="outline" colorScheme="gray">{series.conference}</Badge>
          )}
        </HStack>
        {isLocked ? (
          <Badge colorScheme="gray">Locked</Badge>
        ) : lockTimeLabel ? (
          <Text fontSize="xs" color="gray.400">{lockTimeLabel}</Text>
        ) : null}
      </HStack>

      {/* Matchup: underdog (left) vs favorite (right) */}
      <HStack justify="space-around" mb={3} align="flex-end" gap={2}>
        <VStack gap={0} flex={1} align="center">
          <Text fontSize="xs" color="gray.400" fontWeight="normal">Underdog</Text>
          <Text fontSize="xl" fontWeight="semibold" lineHeight="short">
            {series.lowSeedTeam.abbreviation}
          </Text>
        </VStack>
        <VStack gap={0} align="center" pb={1}>
          {(() => {
            const hw = series.highSeedWins;
            const lw = series.lowSeedWins;
            const gamesPlayed = hw + lw;
            if (isComplete) return null; // handled below
            if (gamesPlayed === 0) return <Text color="gray.300" fontSize="sm">vs</Text>;
            const leaderWins = Math.max(hw, lw);
            const trailerWins = Math.min(hw, lw);
            const leaderAbbr = hw >= lw
              ? series.highSeedTeam.abbreviation
              : series.lowSeedTeam.abbreviation;
            const isTied = hw === lw;
            return (
              <VStack gap={0} align="center">
                <Text fontSize="xs" color="blue.600" fontWeight="semibold">
                  {isTied
                    ? `Tied ${leaderWins}-${leaderWins}`
                    : `${leaderAbbr} leads ${leaderWins}-${trailerWins}`}
                </Text>
              </VStack>
            );
          })()}
        </VStack>
        <VStack gap={0} flex={1} align="center">
          <Text fontSize="xs" color="gray.400" fontWeight="normal">Favorite</Text>
          <Text
            fontSize="xl"
            fontWeight={isFinals ? "bold" : "semibold"}
            color={isFinals ? "orange.600" : undefined}
            lineHeight="short"
          >
            {series.highSeedTeam.abbreviation}
          </Text>
        </VStack>
      </HStack>

      {/* Completed series result */}
      {isComplete && (
        <Box mb={3} px={3} py={2} borderRadius="md" bg="green.50" borderWidth={1} borderColor="green.200">
          <Text fontSize="xs" color="green.700" fontWeight="semibold">
            Final: {winnerAbbr} wins {series.winnerWins}-{series.loserWins}
          </Text>
        </Box>
      )}

      {/* Pick form (unlocked) or locked pick summary */}
      {!isLocked && currentGroupUserId ? (
        <VStack align="stretch" gap={2} pt={1}>
          <NativeSelectRoot size="sm">
            <NativeSelectField
              value={winnerTeamId}
              onChange={(e) => setWinnerTeamId(e.target.value)}
              placeholder="Pick winner"
            >
              <option value={series.highSeedTeam.id}>{series.highSeedTeam.name}</option>
              <option value={series.lowSeedTeam.id}>{series.lowSeedTeam.name}</option>
            </NativeSelectField>
          </NativeSelectRoot>
          <NativeSelectRoot size="sm">
            <NativeSelectField
              value={String(gamesCount)}
              onChange={(e) => setGamesCount(parseInt(e.target.value, 10))}
            >
              {[4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n} games</option>
              ))}
            </NativeSelectField>
          </NativeSelectRoot>
          <Button
            size="sm"
            colorScheme="orange"
            onClick={handleSave}
            loading={isPending}
            disabled={!winnerTeamId}
          >
            Save Pick
          </Button>
        </VStack>
      ) : isLocked && currentPick ? (
        <Box px={3} py={2} borderRadius="md" bg="gray.50" borderWidth={1} borderColor="gray.200">
          <Text fontSize="xs" color="gray.600">
            Your pick:{" "}
            <Text as="span" fontWeight="semibold">{pickedAbbr}</Text>{" "}
            in {currentPick.gamesCount} games
          </Text>
        </Box>
      ) : isLocked && !currentPick && currentGroupUserId ? (
        <Box px={3} py={2} borderRadius="md" bg="red.50" borderWidth={1} borderColor="red.200">
          <Text fontSize="xs" color="red.500">No pick made</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function BracketView() {
  const {
    groupId,
    playoffSeries = [],
    seriesPicks = [],
    seriesLeaderboard = [],
    leaderboardUsers,
    currentUserId,
  } = useGroup();

  const currentGroupUser = leaderboardUsers?.find((u) => u.userId === currentUserId);
  const currentGroupUserId = currentGroupUser?.groupUserId;

  const picksBySeries = new Map(
    seriesPicks
      .filter((p) => p.groupUserId === currentGroupUserId)
      .map((p) => [p.seriesId, { winnerTeamId: p.winnerTeamId, gamesCount: p.gamesCount }])
  );

  return (
    <VStack align="stretch" gap={6}>
      {/* Series leaderboard — reuses Leaderboard table */}
      <Leaderboard
        users={seriesLeaderboard}
        title="Series Bracket Leaderboard"
        emptyText="No picks yet. Make your picks below to appear here."
      />

      {/* Series pick grid — grouped by round */}
      <Box>
        <Text fontWeight="semibold" fontSize="md" mb={3}>
          Make Your Picks
        </Text>
        {playoffSeries.length === 0 ? (
          <Box p={3} borderRadius="md" borderWidth={1} borderColor="gray.200" bg="gray.50">
            <Text color="gray.500" fontSize="sm">
              No series available for this season. Check back when the bracket is set.
            </Text>
          </Box>
        ) : (
          <VStack align="stretch" gap={6}>
            {ROUND_ORDER.map((round) => {
              const seriesInRound = playoffSeries.filter((s) => s.round === round);
              if (seriesInRound.length === 0) return null;
              return (
                <Box key={round}>
                  <Text
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    mb={3}
                  >
                    {ROUND_LABELS[round]}
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    {seriesInRound.map((series) => (
                      <SeriesCard
                        key={series.id}
                        series={series}
                        currentPick={picksBySeries.get(series.id)}
                        groupId={groupId}
                        currentGroupUserId={currentGroupUserId}
                      />
                    ))}
                  </SimpleGrid>
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}
