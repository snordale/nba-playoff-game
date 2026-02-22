"use client";

import { useState } from "react";
import {
  Box,
  Button,
  FieldRoot,
  FieldLabel,
  HStack,
  Input,
  NativeSelectRoot,
  NativeSelectField,
  Stack,
  VStack,
  Text,
  Separator,
} from "@chakra-ui/react";
import { toaster } from "@/lib/toaster";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const fetchAPI = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
};

export default function AdminSeasonBracket() {
  const queryClient = useQueryClient();
  const [seasonYear, setSeasonYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seedSeasonId, setSeedSeasonId] = useState("");
  const [seedTeamId, setSeedTeamId] = useState("");
  const [seed, setSeed] = useState("");
  const [conference, setConference] = useState<"EAST" | "WEST">("EAST");
  const [bracketYear, setBracketYear] = useState("");
  const [syncYear, setSyncYear] = useState("");
  const [autoSeedYear, setAutoSeedYear] = useState("");

  const { data: seasons = [] } = useQuery({
    queryKey: ["adminSeasons"],
    queryFn: () => fetchAPI("/api/admin/seasons"),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createSeason = useMutation({
    mutationFn: (data: { year: number; startDate: string; endDate: string }) =>
      fetchAPI("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSeasons"] });
      queryClient.invalidateQueries({ queryKey: ["getSeasons"] });
      toaster.create({ title: "Season created", status: "success" });
    },
    onError: (e: Error) => {
      toaster.create({ title: "Failed", description: e.message, status: "error" });
    },
  });

  const createSeed = useMutation({
    mutationFn: (data: { seasonId: string; teamId: string; seed: number; conference: string }) =>
      fetchAPI("/api/admin/playoff-seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toaster.create({ title: "Playoff seed saved", status: "success" });
      setSeedTeamId("");
      setSeed("");
    },
    onError: (e: Error) => {
      toaster.create({ title: "Failed", description: e.message, status: "error" });
    },
  });

  const seedBracket = useMutation({
    mutationFn: (year: number) =>
      fetchAPI("/api/admin/seed-bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      }),
    onSuccess: (data: { message: string }) => {
      toaster.create({ title: data.message, status: "success" });
      setBracketYear("");
    },
    onError: (e: Error) => {
      toaster.create({ title: "Failed", description: e.message, status: "error" });
    },
  });

  const autoSeed = useMutation({
    mutationFn: (year: number) =>
      fetchAPI("/api/admin/auto-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      }),
    onSuccess: (data: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["adminSeasons"] });
      queryClient.invalidateQueries({ queryKey: ["getSeasons"] });
      toaster.create({ title: "Auto-seed complete", description: data.message, status: "success", duration: 6000 });
      setAutoSeedYear("");
    },
    onError: (e: Error) => {
      toaster.create({ title: "Auto-seed failed", description: e.message, status: "error", duration: 8000 });
    },
  });

  const syncOutcomes = useMutation({
    mutationFn: (year: number) =>
      fetchAPI("/api/admin/sync-series-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      }),
    onSuccess: (data: { message: string }) => {
      toaster.create({ title: data.message, status: "success" });
      setSyncYear("");
    },
    onError: (e: Error) => {
      toaster.create({ title: "Failed", description: e.message, status: "error" });
    },
  });

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(seasonYear, 10);
    if (isNaN(year) || !startDate || !endDate) {
      toaster.create({ title: "Fill all fields", status: "warning" });
      return;
    }
    createSeason.mutate({ year, startDate, endDate });
  };

  const handleCreateSeed = (e: React.FormEvent) => {
    e.preventDefault();
    const seedNum = parseInt(seed, 10);
    if (!seedSeasonId || !seedTeamId || isNaN(seedNum) || seedNum < 1 || seedNum > 8) {
      toaster.create({ title: "Select season, team, and seed (1-8)", status: "warning" });
      return;
    }
    createSeed.mutate({
      seasonId: seedSeasonId,
      teamId: seedTeamId,
      seed: seedNum,
      conference,
    });
  };

  const teamsList = Array.isArray(teams) ? teams : [];

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6} shadow="sm" mt={8}>
      <Text fontWeight="semibold" fontSize="lg" mb={4}>
        Season & Bracket Management
      </Text>
      <Separator mb={4} />

      {seasons.length === 0 && (
        <Text fontSize="sm" color="gray.600" mb={2}>
          No season yet. Create one below to get started.
        </Text>
      )}

      <VStack gap={6} align="stretch">
        <form onSubmit={handleCreateSeason}>
          <Stack gap={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">Create Season</Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Add a new playoff season with display year and date range. Needed before loading games or setting up the bracket; seasons are also auto-created when loading games from ESPN.
              </Text>
            </Box>
            <FieldRoot>
              <FieldLabel fontSize="xs">Year</FieldLabel>
              <Input
                type="number"
                placeholder="2025"
                value={seasonYear}
                onChange={(e) => setSeasonYear(e.target.value)}
                size="sm"
              />
            </FieldRoot>
            <FieldRoot>
              <FieldLabel fontSize="xs">Start Date</FieldLabel>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="sm"
              />
            </FieldRoot>
            <FieldRoot>
              <FieldLabel fontSize="xs">End Date</FieldLabel>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="sm"
              />
            </FieldRoot>
            <Button
              type="submit"
              size="sm"
              colorScheme="orange"
              loading={createSeason.isPending}
            >
              Create Season
            </Button>
          </Stack>
        </form>

        <Separator />

        {/* Auto-seed: primary workflow */}
        <Stack gap={3}>
          <Box>
            <Text fontSize="sm" fontWeight="medium">Auto-Seed from ESPN Standings</Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Pulls the top-8 seeds per conference from ESPN, upserts all 16 PlayoffSeed records, and creates first-round series — all in one click. Safe to re-run after play-in games to update seeds 7 &amp; 8.
            </Text>
          </Box>
          <HStack>
            <Input
              type="number"
              placeholder="2025"
              value={autoSeedYear}
              onChange={(e) => setAutoSeedYear(e.target.value)}
              size="sm"
              w="120px"
              aria-label="Year for auto-seed"
            />
            <Button
              size="sm"
              colorScheme="orange"
              onClick={() => {
                const y = parseInt(autoSeedYear, 10);
                if (isNaN(y) || y < 2000 || y > 2100) {
                  toaster.create({ title: "Enter a valid year (e.g. 2025)", status: "warning" });
                  return;
                }
                autoSeed.mutate(y);
              }}
              loading={autoSeed.isPending}
            >
              Auto-Seed
            </Button>
          </HStack>
        </Stack>

        <Separator />

        {/* Manual seed fallback */}
        <form onSubmit={handleCreateSeed}>
          <Stack gap={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">Add Playoff Seed (Manual)</Text>
              <Text fontSize="xs" color="gray.500" mt={1}>Fallback if ESPN data is unavailable or incorrect.</Text>
            </Box>
            <FieldRoot>
              <FieldLabel fontSize="xs">Season</FieldLabel>
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  value={seedSeasonId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeedSeasonId(e.target.value)}
                  placeholder="Select season"
                >
                  {seasons.map((s: { id: string; year: number; displayName: string }) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))}
                </NativeSelectField>
              </NativeSelectRoot>
            </FieldRoot>
            <FieldRoot>
              <FieldLabel fontSize="xs">Team</FieldLabel>
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  value={seedTeamId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeedTeamId(e.target.value)}
                  placeholder="Select team"
                >
                  {teamsList.map((t: { id: string; name: string; abbreviation: string }) => (
                    <option key={t.id} value={t.id}>
                      {t.abbreviation} - {t.name}
                    </option>
                  ))}
                </NativeSelectField>
              </NativeSelectRoot>
            </FieldRoot>
            <FieldRoot>
              <FieldLabel fontSize="xs">Seed (1-8)</FieldLabel>
              <Input
                type="number"
                min={1}
                max={8}
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                size="sm"
              />
            </FieldRoot>
            <FieldRoot>
              <FieldLabel fontSize="xs">Conference</FieldLabel>
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  value={conference}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConference(e.target.value as "EAST" | "WEST")}
                >
                  <option value="EAST">EAST</option>
                  <option value="WEST">WEST</option>
                </NativeSelectField>
              </NativeSelectRoot>
            </FieldRoot>
            <Button
              type="submit"
              size="sm"
              colorScheme="orange"
              loading={createSeed.isPending}
            >
              Add Seed
            </Button>
          </Stack>
        </form>

        <Separator />

        <Stack gap={3}>
          <Box>
            <Text fontSize="sm" fontWeight="medium">Seed Bracket (from seeds)</Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Create first-round PlayoffSeries (8 matchups) from existing PlayoffSeed records. Run after you have 16 seeds (e.g. from Auto-Seed or manual Add Seed). Idempotent — skips if any series already exist for that year.
            </Text>
          </Box>
          <HStack>
            <Input
              type="number"
              placeholder="2025"
              value={bracketYear}
              onChange={(e) => setBracketYear(e.target.value)}
              size="sm"
              w="120px"
              aria-label="Year for seed bracket"
            />
            <Button
              size="sm"
              colorScheme="orange"
              onClick={() => {
                const y = parseInt(bracketYear, 10);
                if (isNaN(y) || y < 2000 || y > 2100) {
                  toaster.create({ title: "Enter a valid year (e.g. 2025)", status: "warning" });
                  return;
                }
                seedBracket.mutate(y);
              }}
              loading={seedBracket.isPending}
            >
              Seed Bracket
            </Button>
          </HStack>
        </Stack>

        <Stack gap={3}>
          <Box>
            <Text fontSize="sm" fontWeight="medium">Sync Series Outcomes (from games)</Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Update winner and win counts on all series from completed games, set first-game times, and advance the bracket (create Semifinals, Conference Finals, Finals) in one run. Safe to run multiple times; use after loading games or when series finish.
            </Text>
          </Box>
          <HStack>
            <Input
              type="number"
              placeholder="2025"
              value={syncYear}
              onChange={(e) => setSyncYear(e.target.value)}
              size="sm"
              w="120px"
              aria-label="Year for sync outcomes"
            />
            <Button
              size="sm"
              colorScheme="orange"
              onClick={() => {
                const y = parseInt(syncYear, 10);
                if (isNaN(y) || y < 2000 || y > 2100) {
                  toaster.create({ title: "Enter a valid year (e.g. 2025)", status: "warning" });
                  return;
                }
                syncOutcomes.mutate(y);
              }}
              loading={syncOutcomes.isPending}
            >
              Sync Outcomes
            </Button>
          </HStack>
        </Stack>
      </VStack>
    </Box>
  );
}
