"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  FieldRoot,
  FieldLabel,
  NativeSelectRoot,
  NativeSelectField,
  SimpleGrid,
  Text,
  VStack,
  Separator,
  CardRoot,
  CardBody,
  HStack,
  Badge,
} from "@chakra-ui/react";
import {
  useGetSeasons,
  useGetSeriesByYear,
  useAdminGetAllGroups,
  useAdminGetAllUsers,
  useAdminUpsertSeriesPick,
} from "@/react-query/queries";
import { toaster } from "@/lib/toaster";

const ROUND_ORDER = ["FIRST_ROUND", "SEMIFINALS", "CONFERENCE_FINALS", "FINALS"] as const;
const ROUND_LABELS: Record<string, string> = {
  FIRST_ROUND: "First Round",
  SEMIFINALS: "Semifinals",
  CONFERENCE_FINALS: "Conference Finals",
  FINALS: "Finals",
};

interface SeriesOption {
  id: string;
  round: string;
  conference: string | null;
  highSeedTeam: { id: string; name: string; abbreviation: string };
  lowSeedTeam: { id: string; name: string; abbreviation: string };
  winnerTeamId: string | null;
  firstGameStartsAt: string | null;
}

interface AdminGroup {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  username: string;
}

export default function AdminSeriesPick() {
  const [year, setYear] = useState<number | null>(null);
  const [round, setRound] = useState<string>("FIRST_ROUND");
  const [seriesId, setSeriesId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [winnerTeamId, setWinnerTeamId] = useState<string>("");
  const [gamesCount, setGamesCount] = useState<number>(4);

  const { data: seasons = [] } = useGetSeasons();
  const { data: seriesList = [], isLoading: isLoadingSeries } = useGetSeriesByYear(year);
  const { data: groups = [], isLoading: isLoadingGroups } = useAdminGetAllGroups();
  const { data: users = [], isLoading: isLoadingUsers } = useAdminGetAllUsers({
    groupId: groupId || undefined,
  });

  const seriesByRound = seriesList.filter((s: SeriesOption) => s.round === round);
  const selectedSeries = seriesList.find((s: SeriesOption) => s.id === seriesId);

  const { mutate: upsertSeriesPick, isPending: isSubmitting } = useAdminUpsertSeriesPick();

  useEffect(() => {
    setSeriesId("");
    setWinnerTeamId("");
  }, [year, round]);

  useEffect(() => {
    if (selectedSeries) {
      if (
        winnerTeamId &&
        winnerTeamId !== selectedSeries.highSeedTeam.id &&
        winnerTeamId !== selectedSeries.lowSeedTeam.id
      ) {
        setWinnerTeamId("");
      }
    } else {
      setWinnerTeamId("");
    }
  }, [selectedSeries, winnerTeamId]);

  useEffect(() => {
    setUserId("");
  }, [groupId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !userId || !seriesId || !winnerTeamId) {
      toaster.create({
        title: "Missing fields",
        description: "Select group, user, series, and winner.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    upsertSeriesPick(
      {
        groupId,
        userId,
        seriesId,
        winnerTeamId,
        gamesCount,
      },
      {
        onSuccess: () => {
          toaster.create({
            title: "Series pick saved",
            description: "The series pick was created or updated.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        },
        onError: (error: Error) => {
          toaster.create({
            title: "Failed",
            description: error.message || "Could not save series pick.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  };

  const years = (seasons as { year: number }[]).map((s) => s.year).sort((a, b) => b - a);

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      borderWidth="1px"
      borderRadius="lg"
      p={6}
      shadow="sm"
    >
      <VStack gap={4} align="stretch">
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={1}>
            Upsert Series Pick
          </Text>
          <Text fontSize="sm" color="gray.600">
            Manually set a user&apos;s bracket pick for a series: choose year, round, series, then
            group, user, winner, and games (4–7). Works for locked series.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <FieldRoot required>
            <FieldLabel>Year</FieldLabel>
            <NativeSelectRoot>
              <NativeSelectField
                placeholder="Select year"
                value={year ?? ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const v = e.target.value;
                  setYear(v ? parseInt(v, 10) : null);
                }}
              >
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
          </FieldRoot>

          <FieldRoot required>
            <FieldLabel>Round</FieldLabel>
            <NativeSelectRoot>
              <NativeSelectField
                value={round}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setRound(e.target.value)
                }
              >
                {ROUND_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {ROUND_LABELS[r]}
                  </option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
          </FieldRoot>
        </SimpleGrid>

        {year != null && (
          <>
            <FieldRoot required>
              <FieldLabel>Series</FieldLabel>
              {isLoadingSeries ? (
                <Text color="gray.500">Loading series…</Text>
              ) : seriesByRound.length === 0 ? (
                <Text color="gray.500">
                  No series for {ROUND_LABELS[round] ?? round} in {year}.
                </Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={2}>
                  {seriesByRound.map((s: SeriesOption) => (
                    <CardRoot
                      key={s.id}
                      cursor="pointer"
                      variant="outline"
                      borderColor={seriesId === s.id ? "orange.500" : "gray.200"}
                      borderWidth={seriesId === s.id ? 2 : 1}
                      onClick={() => setSeriesId(s.id)}
                      _hover={{ borderColor: "orange.300" }}
                    >
                      <CardBody py={2} px={3}>
                        <HStack justify="space-between" flexWrap="wrap" gap={1}>
                          <Text fontWeight={seriesId === s.id ? "bold" : "normal"}>
                            {s.lowSeedTeam.abbreviation} vs {s.highSeedTeam.abbreviation}
                          </Text>
                          {s.conference && (
                            <Badge size="sm" colorPalette="gray">
                              {s.conference}
                            </Badge>
                          )}
                        </HStack>
                      </CardBody>
                    </CardRoot>
                  ))}
                </SimpleGrid>
              )}
            </FieldRoot>

            <Separator my={2} />

            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <FieldRoot required>
                <FieldLabel>Group</FieldLabel>
                <NativeSelectRoot disabled={isLoadingGroups}>
                  <NativeSelectField
                    placeholder="Select group"
                    value={groupId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setGroupId(e.target.value)
                    }
                  >
                    {(groups as AdminGroup[])?.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
              </FieldRoot>

              <FieldRoot required>
                <FieldLabel>User</FieldLabel>
                <NativeSelectRoot disabled={isLoadingUsers || !groupId}>
                  <NativeSelectField
                    placeholder={groupId ? "Select user" : "Select group first"}
                    value={userId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setUserId(e.target.value)
                    }
                  >
                    {(users as AdminUser[])?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
              </FieldRoot>
            </SimpleGrid>

            {selectedSeries && (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <FieldRoot required>
                  <FieldLabel>Winner</FieldLabel>
                  <NativeSelectRoot>
                    <NativeSelectField
                      placeholder="Select winner"
                      value={winnerTeamId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setWinnerTeamId(e.target.value)
                      }
                    >
                      <option value={selectedSeries.lowSeedTeam.id}>
                        {selectedSeries.lowSeedTeam.abbreviation} (
                        {selectedSeries.lowSeedTeam.name})
                      </option>
                      <option value={selectedSeries.highSeedTeam.id}>
                        {selectedSeries.highSeedTeam.abbreviation} (
                        {selectedSeries.highSeedTeam.name})
                      </option>
                    </NativeSelectField>
                  </NativeSelectRoot>
                </FieldRoot>

                <FieldRoot required>
                  <FieldLabel>Games (4–7)</FieldLabel>
                  <NativeSelectRoot>
                    <NativeSelectField
                      value={String(gamesCount)}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setGamesCount(parseInt(e.target.value, 10))
                      }
                    >
                      {[4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>
                          {n} games
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                </FieldRoot>
              </SimpleGrid>
            )}

            <Button
              mt={4}
              type="submit"
              colorScheme="orange"
              loading={isSubmitting}
              disabled={
                isSubmitting ||
                !groupId ||
                !userId ||
                !seriesId ||
                !winnerTeamId
              }
            >
              Upsert Series Pick
            </Button>
          </>
        )}

        {year == null && (
          <Text fontSize="sm" color="gray.500">
            Select a year to load series and set a pick.
          </Text>
        )}
      </VStack>
    </Box>
  );
}
