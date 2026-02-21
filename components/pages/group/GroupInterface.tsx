// components/pages/group/GroupInterface.tsx
"use client";

import { type SubmissionView } from "@/utils/submission-utils";
import { CalendarIcon, HamburgerIcon } from '@chakra-ui/icons';
import { Box, Button, ButtonGroup, HStack, Stack, Text, useToast, VStack } from "@chakra-ui/react";
import { addDays, isBefore, isEqual } from 'date-fns';
import { formatInTimeZone, format as formatTz, fromZonedTime } from 'date-fns-tz';
import React, { useEffect, useMemo, useRef } from 'react';
import { queryClient, useGenerateInviteLink } from "../../../react-query/queries";
import { Body1 } from "../../Body1";
import { CalendarDisplay } from './CalendarDisplay';
import { DailySubmissionCard } from './DailySubmissionCard';
import { DayModal } from "./DayModal";
import { useGroup } from './GroupContext';
import { Leaderboard } from "./Leaderboard";
import { SeasonSelector } from "./SeasonSelector";
import { BracketView } from "./BracketView";

export const GroupInterface = () => {
    const {
        group,
        groupId,
        onSubmit,
        selectedDate,
        search,
        setSearch,
        isDayModalOpen,
        setIsDayModalOpen,
        gameCountsByDate,
        leaderboardUsers,
        viewMode,
        setViewMode,
        currentUserUsername,
        currentUserId,
        previouslySubmittedPlayerIdsForCurrentUser,
        submissionsByDate,
        season,
        gameMode,
        setGameMode,
        playoffSeries,
    } = useGroup();

    const { mutateAsync: generateLink, isPending: isGeneratingLink } = useGenerateInviteLink();
    const toast = useToast();
    const todayRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [didCopy, setDidCopy] = React.useState(false);

    async function handleGenerateInvite() {
        setDidCopy(false);
        try {
            const response = await generateLink({ groupId });
            if (response.inviteUrl) {
                const urlToCopy = response.inviteUrl;
                navigator.clipboard.writeText(urlToCopy).then(() => {
                    setDidCopy(true);
                    toast({
                        title: "Invite link copied!",
                        description: "Share the link with your friends.",
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                    });
                    setTimeout(() => setDidCopy(false), 3000);
                }).catch(err => {
                    console.error('Failed to copy link: ', err);
                    toast({
                        title: "Auto-copy failed",
                        description: "Could not copy the link automatically. You may need to copy it manually.",
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                });
            } else {
                toast({
                    title: "Error generating link",
                    description: "Could not retrieve invite link.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error: any) {
            toast({
                title: "Error generating link",
                description: error.message || "An unexpected error occurred.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Return date strings in YYYY-MM-DD format from season start to end (America/New_York).
    const sortedDates = useMemo<string[]>(() => {
        const TIMEZONE = "America/New_York";
        if (!season?.startDate || !season?.endDate) return [];
        try {
            const startNY = new Date(season.startDate);
            const endNY = new Date(season.endDate);

            if (isBefore(endNY, startNY)) return [];

            const dateStrings: string[] = [];
            let currentDate = startNY;

            while (isBefore(currentDate, endNY) || isEqual(currentDate, endNY)) {
                dateStrings.push(formatInTimeZone(currentDate, TIMEZONE, "yyyy-MM-dd"));
                currentDate = addDays(currentDate, 1);
            }

            return dateStrings;
        } catch (err) {
            console.error("sortedDates failed:", err);
            return [];
        }
    }, [season?.startDate, season?.endDate]);


    useEffect(() => {
        if (viewMode === 'list' && todayRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const element = todayRef.current;
            const elementTopRelativeToContainer = element.offsetTop - container.offsetTop;
            const containerHeight = container.clientHeight;
            const elementHeight = element.offsetHeight;
            const scrollTo = elementTopRelativeToContainer - (containerHeight / 2) + (elementHeight / 2);
            container.scrollTo({ top: scrollTo, behavior: 'smooth' });
        }
    }, [viewMode]);

    const usersWithSubmissionsForSelectedDate = useMemo(() => {
        if (!leaderboardUsers) return [];
        return leaderboardUsers.map(user => {
            const submission = user?.submissions?.find(sub =>
                formatTz(new Date(sub.gameDate), 'yyyy-MM-dd', { timeZone: 'America/New_York' }) === selectedDate
            );
            const submissionView: SubmissionView | null = submission
                ? { ...submission, userId: user.userId, username: user.username }
                : null;
            return {
                userId: user.userId,
                username: user.username,
                submission: submissionView
            };
        });
    }, [selectedDate, leaderboardUsers]);

    // Pre-playoff: no season configured — show message and invite only
    if (!season) {
        return (
            <Stack gap={6}>
                <HStack justifyContent="space-between" flexWrap="wrap" gap={2}>
                    <Body1 fontWeight="semibold" fontSize="2xl">
                        {group?.name}
                    </Body1>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateInvite}
                        isLoading={isGeneratingLink}
                        colorScheme="orange"
                        aria-label={didCopy ? "Invite link copied" : "Copy invite link to clipboard"}
                    >
                        {didCopy ? "Copied!" : "Copy Invite Link"}
                    </Button>
                </HStack>
                <Box
                    p={5}
                    borderRadius="lg"
                    borderWidth={1}
                    borderColor="orange.200"
                    bg="orange.50"
                >
                    <Text fontWeight="semibold" color="orange.800" mb={2}>
                        Pre-playoff
                    </Text>
                    <Text color="gray.700" fontSize="sm" mb={3}>
                        The playoff season and bracket aren&apos;t set up yet. You can create and join groups and invite friends now. Once playoff dates and series are configured by an admin, you&apos;ll be able to make <strong>daily picks</strong> and <strong>series bracket picks</strong> here.
                    </Text>
                    <Text color="gray.600" fontSize="xs">
                        In the meantime, share the invite link above so your group is ready when the playoffs start.
                    </Text>
                </Box>
                {leaderboardUsers && leaderboardUsers.length > 0 && (
                    <Box>
                        <Text fontWeight="medium" fontSize="sm" mb={2}>Group members ({leaderboardUsers.length})</Text>
                        <VStack align="stretch" spacing={1}>
                            {leaderboardUsers.map((u) => (
                                <Text key={u.userId} fontSize="sm" color="gray.600">{u.username}</Text>
                            ))}
                        </VStack>
                    </Box>
                )}
            </Stack>
        );
    }

    return (
        <Stack gap={6}>
            {/* Header: group name + season + invite */}
            <HStack justifyContent="space-between" flexWrap="wrap" gap={2}>
                <HStack>
                    <Body1 fontWeight="semibold" fontSize="2xl">
                        {group?.name}
                    </Body1>
                    <SeasonSelector currentSeason={season} />
                </HStack>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateInvite}
                    isLoading={isGeneratingLink}
                    colorScheme="orange"
                    aria-label={didCopy ? "Invite link copied" : "Copy invite link to clipboard"}
                >
                    {didCopy ? "Copied!" : "Copy Invite Link"}
                </Button>
            </HStack>

            {/* Primary game-mode tabs */}
            <HStack role="tablist" aria-label="Game mode">
                <ButtonGroup size="sm" isAttached variant="outline">
                    <Button
                        role="tab"
                        aria-selected={gameMode === "daily"}
                        onClick={() => setGameMode("daily")}
                        colorScheme="orange"
                        variant={gameMode === "daily" ? "solid" : "outline"}
                    >
                        Daily Picks
                    </Button>
                    <Button
                        role="tab"
                        aria-selected={gameMode === "bracket"}
                        onClick={() => setGameMode("bracket")}
                        colorScheme="orange"
                        variant={gameMode === "bracket" ? "solid" : "outline"}
                    >
                        Bracket
                    </Button>
                </ButtonGroup>
            </HStack>

            {/* Tab content */}
            {gameMode === "bracket" ? (
                <BracketView />
            ) : (
            <VStack alignItems="stretch" spacing={4}>
                {/* Leaderboard lives inside the daily tab */}
                <Leaderboard />

                {/* Empty state: season exists but no data yet */}
                {season && Object.keys(gameCountsByDate ?? {}).length === 0 && (
                    <Box p={3} borderRadius="md" borderWidth={1} borderColor="gray.200" bg="gray.50">
                        <Text fontSize="sm" color="gray.700">
                            No games loaded yet for this season. Once the playoff schedule is set, you&apos;ll be able to make daily picks here.
                        </Text>
                    </Box>
                )}

                {/* Secondary view-mode toggle */}
                <HStack role="tablist" aria-label="Daily view">
                    <ButtonGroup size="sm" isAttached variant="outline">
                        <Button
                            role="tab"
                            aria-selected={viewMode === "list"}
                            onClick={() => setViewMode("list")}
                            colorScheme="orange"
                            variant={viewMode === "list" ? "solid" : "outline"}
                            leftIcon={<HamburgerIcon />}
                        >
                            List
                        </Button>
                        <Button
                            role="tab"
                            aria-selected={viewMode === "calendar"}
                            onClick={() => setViewMode("calendar")}
                            colorScheme="orange"
                            variant={viewMode === "calendar" ? "solid" : "outline"}
                            leftIcon={<CalendarIcon />}
                        >
                            Calendar
                        </Button>
                    </ButtonGroup>
                </HStack>

                {viewMode === "calendar" ? (
                    <CalendarDisplay />
                ) : (
                    <VStack
                        ref={scrollContainerRef}
                        spacing={3}
                        align="stretch"
                        maxH="600px"
                        overflowY="auto"
                        css={{
                            '&::-webkit-scrollbar': { width: '4px' },
                            '&::-webkit-scrollbar-track': { width: '6px', background: 'rgba(0,0,0,0.1)' },
                            '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.2)', borderRadius: '24px' },
                        }}
                        px={1}
                        borderTopWidth={1}
                        borderColor="gray.100"
                        pt={4}
                    >
                        {sortedDates.map(date => {
                            const todayInNyStr = formatTz(new Date(), 'yyyy-MM-dd', { timeZone: 'America/New_York' });
                            const endOfNyDay = fromZonedTime(`${date}T23:59:59.999`, 'America/New_York');
                            const isInPast = isBefore(endOfNyDay, new Date());
                            const isToday = date === todayInNyStr;
                            const usersWithSubmissions = submissionsByDate?.[date] ?? [];
                            const allUsersWithSubmissions = (leaderboardUsers ?? []).map(user => {
                                const submission = usersWithSubmissions.find(sub => sub.userId === user.userId);
                                return {
                                    userId: user.userId,
                                    username: user.username,
                                    submission: submission ? submission.submission : null
                                };
                            });
                            return (
                                <div key={date} ref={isToday ? todayRef : undefined}>
                                    <DailySubmissionCard
                                        date={date}
                                        gameCount={gameCountsByDate?.[date] ?? 0}
                                        usersWithSubmissions={allUsersWithSubmissions}
                                        isToday={isToday}
                                        isInPast={isInPast}
                                    />
                                </div>
                            );
                        })}
                    </VStack>
                )}
            </VStack>
            )}

            {selectedDate && currentUserId && currentUserUsername && (
                <DayModal
                    isOpen={isDayModalOpen}
                    onClose={(refresh) => {
                        setIsDayModalOpen(false);
                        if (refresh) {
                            queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
                        }
                    }}
                    onSubmit={onSubmit}
                    search={search}
                    onSearchChange={setSearch}
                />
            )}
        </Stack>
    );
};