// components/pages/group/GroupInterface.tsx
'use client';

import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from '@/constants';
import { CalendarIcon, HamburgerIcon } from '@chakra-ui/icons';
import { Button, ButtonGroup, HStack, Stack, useToast, VStack } from "@chakra-ui/react";
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import React, { useEffect, useMemo, useRef } from 'react';
import { queryClient, useGenerateInviteLink } from "../../../react-query/queries";
import { Body1 } from "../../Body1";
import { CalendarDisplay } from './CalendarDisplay';
import { DailySubmissionCard } from './DailySubmissionCard';
import { DayModal } from "./DayModal";
import { useGroup } from './GroupContext';
import { Leaderboard } from './Leaderboard';
import { type SubmissionView } from '@/utils/submission-utils';

export const GroupInterface = () => {
    const {
        group,
        groupId,
        onSubmit,
        selectedDate,
        search,
        setSearch,
        handleDayClick: onCalendarDateClick,
        isDayModalOpen,
        setIsDayModalOpen,
        gameCountsByDate,
        leaderboardUsers,
        viewMode,
        setViewMode,
        currentUserUsername,
        currentUserId,
        previouslySubmittedPlayerIdsForCurrentUser
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

    const sortedDates = useMemo(() => {
        const startDate = parseISO(PLAYOFF_START_DATE);
        const endDate = parseISO(PLAYOFF_END_DATE);
        try {
            return eachDayOfInterval({ start: startDate, end: endDate })
                .map(date => format(date, 'yyyy-MM-dd'))
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        } catch (e) {
            console.error("Error calculating date interval:", e);
            return [];
        }
    }, []);

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
                format(new Date(sub.gameDate), 'yyyy-MM-dd') === selectedDate
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
            format(new Date(sub.gameDate), 'yyyy-MM-dd') === selectedDate
        );
        return submission ? { playerName: submission.playerName, playerId: submission.playerId } : null;
    }, [selectedDate, leaderboardUsers, currentUserId]);

    const handleCardClick = (date: string) => {
        onCalendarDateClick(date);
    };

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
                            const isToday = new Date(date).toDateString() === new Date().toDateString();
                            const usersWithSubmissionsForDate = leaderboardUsers?.map(user => {
                                const submission = user.submissions?.find(sub =>
                                    new Date(sub.gameDate).toISOString().split('T')[0] === date
                                );
                                const submissionView: SubmissionView | null = submission
                                    ? { ...submission, userId: user.userId, username: user.username }
                                    : null;
                                return {
                                    userId: user.userId,
                                    username: user.username,
                                    submission: submissionView
                                };
                            }) || [];

                            return (
                                <div key={date} ref={isToday ? todayRef : null}>
                                    <DailySubmissionCard
                                        date={date}
                                        hasGames={(gameCountsByDate?.[date] ?? 0) > 0}
                                        gameCount={gameCountsByDate?.[date] ?? 0}
                                        onClick={handleCardClick}
                                        users={usersWithSubmissionsForDate}
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