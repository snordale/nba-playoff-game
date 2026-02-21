"use client";

import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Stack,
  useToast,
  VStack,
  Text,
  Divider,
} from "@chakra-ui/react";
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
  const toast = useToast();
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
      toast({ title: "Season created", status: "success" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed", description: e.message, status: "error" });
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
      toast({ title: "Playoff seed saved", status: "success" });
      setSeedTeamId("");
      setSeed("");
    },
    onError: (e: Error) => {
      toast({ title: "Failed", description: e.message, status: "error" });
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
      toast({ title: data.message, status: "success" });
      setBracketYear("");
    },
    onError: (e: Error) => {
      toast({ title: "Failed", description: e.message, status: "error" });
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
      toast({ title: "Auto-seed complete", description: data.message, status: "success", duration: 6000 });
      setAutoSeedYear("");
    },
    onError: (e: Error) => {
      toast({ title: "Auto-seed failed", description: e.message, status: "error", duration: 8000 });
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
      toast({ title: data.message, status: "success" });
      setSyncYear("");
    },
    onError: (e: Error) => {
      toast({ title: "Failed", description: e.message, status: "error" });
    },
  });

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(seasonYear, 10);
    if (isNaN(year) || !startDate || !endDate) {
      toast({ title: "Fill all fields", status: "warning" });
      return;
    }
    createSeason.mutate({ year, startDate, endDate });
  };

  const handleCreateSeed = (e: React.FormEvent) => {
    e.preventDefault();
    const seedNum = parseInt(seed, 10);
    if (!seedSeasonId || !seedTeamId || isNaN(seedNum) || seedNum < 1 || seedNum > 8) {
      toast({ title: "Select season, team, and seed (1-8)", status: "warning" });
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
      <Divider mb={4} />

      {seasons.length === 0 && (
        <Text fontSize="sm" color="gray.600" mb={2}>
          No season yet. Create one below to get started.
        </Text>
      )}

      <VStack spacing={6} align="stretch">
        <form onSubmit={handleCreateSeason}>
          <Stack spacing={3}>
            <Text fontSize="sm" fontWeight="medium">
              Create Season
            </Text>
            <FormControl>
              <FormLabel fontSize="xs">Year</FormLabel>
              <Input
                type="number"
                placeholder="2025"
                value={seasonYear}
                onChange={(e) => setSeasonYear(e.target.value)}
                size="sm"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">Start Date</FormLabel>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="sm"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">End Date</FormLabel>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="sm"
              />
            </FormControl>
            <Button
              type="submit"
              size="sm"
              colorScheme="orange"
              isLoading={createSeason.isPending}
            >
              Create Season
            </Button>
          </Stack>
        </form>

        <Divider />

        {/* Auto-seed: primary workflow */}
        <Stack spacing={3}>
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
                  toast({ title: "Enter a valid year (e.g. 2025)", status: "warning" });
                  return;
                }
                autoSeed.mutate(y);
              }}
              isLoading={autoSeed.isPending}
            >
              Auto-Seed
            </Button>
          </HStack>
        </Stack>

        <Divider />

        {/* Manual seed fallback */}
        <form onSubmit={handleCreateSeed}>
          <Stack spacing={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">Add Playoff Seed (Manual)</Text>
              <Text fontSize="xs" color="gray.500" mt={1}>Fallback if ESPN data is unavailable or incorrect.</Text>
            </Box>
            <FormControl>
              <FormLabel fontSize="xs">Season</FormLabel>
              <Select
                size="sm"
                value={seedSeasonId}
                onChange={(e) => setSeedSeasonId(e.target.value)}
                placeholder="Select season"
              >
                {seasons.map((s: { id: string; year: number; displayName: string }) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">Team</FormLabel>
              <Select
                size="sm"
                value={seedTeamId}
                onChange={(e) => setSeedTeamId(e.target.value)}
                placeholder="Select team"
              >
                {teamsList.map((t: { id: string; name: string; abbreviation: string }) => (
                  <option key={t.id} value={t.id}>
                    {t.abbreviation} - {t.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">Seed (1-8)</FormLabel>
              <Input
                type="number"
                min={1}
                max={8}
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                size="sm"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">Conference</FormLabel>
              <Select
                size="sm"
                value={conference}
                onChange={(e) => setConference(e.target.value as "EAST" | "WEST")}
              >
                <option value="EAST">EAST</option>
                <option value="WEST">WEST</option>
              </Select>
            </FormControl>
            <Button
              type="submit"
              size="sm"
              colorScheme="orange"
              isLoading={createSeed.isPending}
            >
              Add Seed
            </Button>
          </Stack>
        </form>

        <Divider />

        <Stack spacing={3}>
          <Text fontSize="sm" fontWeight="medium">
            Seed Bracket (from seeds)
          </Text>
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
                  toast({ title: "Enter a valid year (e.g. 2025)", status: "warning" });
                  return;
                }
                seedBracket.mutate(y);
              }}
              isLoading={seedBracket.isPending}
            >
              Seed Bracket
            </Button>
          </HStack>
        </Stack>

        <Stack spacing={3}>
          <Text fontSize="sm" fontWeight="medium">
            Sync Series Outcomes (from games)
          </Text>
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
                  toast({ title: "Enter a valid year (e.g. 2025)", status: "warning" });
                  return;
                }
                syncOutcomes.mutate(y);
              }}
              isLoading={syncOutcomes.isPending}
            >
              Sync Outcomes
            </Button>
          </HStack>
        </Stack>
      </VStack>
    </Box>
  );
}
