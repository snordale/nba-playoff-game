// components/pages/group/GroupInterface.tsx
'use client';

import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from '@/constants';
import { type SubmissionView } from '@/utils/submission-utils';
import { CalendarIcon, HamburgerIcon } from '@chakra-ui/icons';
import { Button, ButtonGroup, HStack, Stack, useToast, VStack } from "@chakra-ui/react";
import { addDays, isBefore, isEqual } from 'date-fns';
import { formatInTimeZone, format as formatTz, fromZonedTime, toZonedTime } from 'date-fns-tz';
import React, { useEffect, useMemo, useRef } from 'react';
import { queryClient, useGenerateInviteLink } from "../../../react-query/queries";
import { Body1 } from "../../Body1";
import { CalendarDisplay } from './CalendarDisplay';
import { DailySubmissionCard } from './DailySubmissionCard';
import { DayModal } from "./DayModal";
import { useGroup } from './GroupContext';
import { Leaderboard } from './Leaderboard';

export const GroupInterface = () => {
    const {
        group,
        groupId,
        onSubmit,
        selectedDate,
        search,
        setSearch,
        handleDayClick,
        isDayModalOpen,
        setIsDayModalOpen,
        gameCountsByDate,
        leaderboardUsers,
        viewMode,
        setViewMode,
        currentUserUsername,
        currentUserId,
        previouslySubmittedPlayerIdsForCurrentUser,
        submissionsByDate
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

    // Return date strings in YYYY-MM-DD format, starting from PLAYOFF_START_DATE and ending at PLAYOFF_END_DATE
    // based on the America/New_York timezone.
    const sortedDates = useMemo<string[]>(() => {
        const TIMEZONE = 'America/New_York';
        try {
            // Parse start and end dates in the NY timezone
            const startNY = fromZonedTime(`${PLAYOFF_START_DATE}T00:00:00`, TIMEZONE);
            const endNY = fromZonedTime(`${PLAYOFF_END_DATE}T00:00:00`, TIMEZONE);

            if (isBefore(endNY, startNY)) {
                console.error("Playoff end date is before start date.");
                return [];
            }

            const dateStrings: string[] = [];
            let currentDate = startNY;

            console.log('startNY', startNY);
            console.log('endNY', endNY)
            // Manually iterate through dates within the NY timezone
            while (isBefore(currentDate, endNY) || isEqual(currentDate, endNY)) {
                dateStrings.push(formatInTimeZone(currentDate, TIMEZONE, 'yyyy-MM-dd'));
                currentDate = addDays(currentDate, 1);
            }

            console.log('dateStrings', dateStrings);

            return dateStrings;
        } catch (err) {
            console.error('sortedDates failed:', err);
            return [];
        }
    }, [PLAYOFF_START_DATE, PLAYOFF_END_DATE]);


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
            const submission = user.submissions?.find(sub =>
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

    const currentSubmissionForSelectedDate = useMemo(() => {
        if (!selectedDate || !leaderboardUsers || !currentUserId) return null;
        const currentUserData = leaderboardUsers.find(u => u.userId === currentUserId);
        const submission = currentUserData?.submissions?.find(sub =>
            formatTz(new Date(sub.gameDate), 'yyyy-MM-dd', { timeZone: 'America/New_York' }) === selectedDate
        );
        return submission ? { playerName: submission.playerName, playerId: submission.playerId } : null;
    }, [selectedDate, leaderboardUsers, currentUserId]);

    return (
        <Stack gap={6}>
            <HStack justifyContent='space-between'>
                <Body1 fontWeight="semibold" fontSize="2xl">
                    {group?.name}
                </Body1>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateInvite}
                    isLoading={isGeneratingLink}
                    colorScheme="orange"
                >
                    {didCopy ? "Copied!" : "Copy Invite Link"}
                </Button>
            </HStack>

            <Leaderboard />

            <VStack alignItems='stretch'>
                <HStack>
                    <ButtonGroup size="sm" isAttached variant="outline">
                        <Button
                            onClick={() => setViewMode('list')}
                            colorScheme="orange"
                            variant={viewMode === 'list' ? 'solid' : 'outline'}
                            leftIcon={<HamburgerIcon />}
                        >
                            List
                        </Button>
                        <Button
                            onClick={() => setViewMode('calendar')}
                            colorScheme="orange"
                            variant={viewMode === 'calendar' ? 'solid' : 'outline'}
                            leftIcon={<CalendarIcon />}
                        >
                            Calendar
                        </Button>
                    </ButtonGroup>
                </HStack>

                {viewMode === 'calendar' ? (
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
                            const TZ = 'America/New_York';
                            const localDate = new Date(date);
                            const dateInNyStr = formatTz(localDate, 'yyyy-MM-dd', { timeZone: TZ });
                            const todayInNyStr = formatTz(new Date(), 'yyyy-MM-dd', { timeZone: TZ });

                            const endOfNyDay = fromZonedTime(`${dateInNyStr}T23:59:59.999`, TZ);
                            const isInPast = isBefore(endOfNyDay, new Date());
                            const isToday = date === todayInNyStr;

                            const usersWithSubmissions = submissionsByDate?.[date] ?? [];

                            const allUsersWithSubmissions = leaderboardUsers.map(user => {
                                const submission = usersWithSubmissions.find(sub => sub.userId === user.userId);
                                return {
                                    userId: user.userId,
                                    username: user.username,
                                    submission: submission ? submission.submission : null
                                }
                            });

                            console.log(date)

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

            {selectedDate && currentUserId && currentUserUsername && (
                <DayModal
                    isOpen={isDayModalOpen}
                    onClose={(refresh) => {
                        setIsDayModalOpen(false);
                        if (refresh) {
                            queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
                        }
                    }}
                    selectedDate={selectedDate}
                    loadingSubmissions={false}
                    onSubmit={onSubmit}
                    search={search}
                    onSearchChange={setSearch}
                    currentSubmissionForUser={currentSubmissionForSelectedDate}
                    previouslySubmittedPlayerIds={previouslySubmittedPlayerIdsForCurrentUser || []}
                    currentUserUsername={currentUserUsername}
                    usersWithSubmissionsForDate={usersWithSubmissionsForSelectedDate}
                />
            )}
        </Stack>
    );
};