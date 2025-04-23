'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Select,
    Input,
    Stack,
    useToast,
    Spinner,
    Text,
    FormErrorMessage,
    VStack,
    HStack,
    SimpleGrid,
    Divider
} from '@chakra-ui/react';
import {
    useAdminGetAllGroups,
    useAdminGetAllUsers,
    useGetPlayers,
    useAdminUpsertSubmission
} from '@/react-query/queries';
import { formatInTimeZone } from 'date-fns-tz';
import { TypeaheadInput, type TypeaheadOption } from '@/components/shared/TypeaheadInput';

// Define types for fetched data (adjust if needed based on actual API response)
interface AdminGroup {
    id: string;
    name: string;
}

interface AdminUser {
    id: string;
    username: string;
    email?: string; // Make email optional based on API response
}

interface PlayerForSelection {
    id: string;
    name: string;
    teamName?: string;
    teamAbbreviation?: string;
}

const AdminInterface = () => {
    const toast = useToast();
    const TIMEZONE = 'America/New_York';

    // Form State
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(
        formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd')
    );
    const [selectedPlayer, setSelectedPlayer] = useState<TypeaheadOption | null>(null);

    // Fetching Data
    const { data: groups, isLoading: isLoadingGroups, error: groupsError } = useAdminGetAllGroups();

    // Fetch users based on the selected group
    const { data: users, isLoading: isLoadingUsers, error: usersError } = useAdminGetAllUsers({
        groupId: selectedGroupId || undefined,
        // React Query automatically handles enabling/disabling based on the key changing
        // No need for explicit enabled flag here unless specific conditions warrant it
    });

    // Fetch players based on the selected date
    const { data: playersData, isLoading: isLoadingPlayers, error: playersError } = useGetPlayers({
        date: selectedDate, // Pass the date in YYYY-MM-DD format
    });

    // Mutation Hook
    const { mutate: upsertSubmission, isPending: isSubmitting, error: submissionError } = useAdminUpsertSubmission();

    // --- Removed client-side filtering useMemo --- 
    // The hook now fetches filtered data based on selectedGroupId.
    const usersForSelectedGroup = users || []; // Directly use the potentially filtered list

    // Map raw player data to TypeaheadOption format
    const playerOptions = useMemo<TypeaheadOption[]>(() => {
        if (!playersData) return [];
        const playerDataArray = Array.isArray(playersData) ? playersData : [];
        return (playerDataArray as PlayerForSelection[]).map(player => ({
            id: player.id,
            label: `${player.name} ${player.teamAbbreviation ? `(${player.teamAbbreviation})` : ''}`
        })).sort((a, b) => a.label.localeCompare(b.label)); // Sort by label now
    }, [playersData]);

    // Form Submission Handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedGroupId || !selectedUserId || !selectedDate || !selectedPlayer?.id) {
            toast({
                title: 'Missing Information',
                description: 'Please fill out all fields.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        upsertSubmission(
            { groupId: selectedGroupId, userId: selectedUserId, date: selectedDate, playerId: selectedPlayer.id },
            {
                onSuccess: () => {
                    toast({
                        title: 'Submission Successful',
                        description: 'The submission has been created or updated.',
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                    });
                    setSelectedPlayer(null);
                },
                onError: (error: any) => {
                    toast({
                        title: 'Submission Failed',
                        description: error.message || 'An unexpected error occurred.',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                },
            }
        );
    };

    // Effect to reset user & player selection when group changes
    useEffect(() => {
        setSelectedUserId('');
        setSelectedPlayer(null);
    }, [selectedGroupId]);

    // Effect to reset player selection when date changes
    useEffect(() => {
        setSelectedPlayer(null);
    }, [selectedDate]);

    // Handle API errors for display
    if (groupsError) return <Text color="red.500">Error loading groups: {groupsError.message}</Text>;
    // Don't block rendering for user errors initially, handle in dropdown
    // if (usersError) return <Text color="red.500">Error loading users: {usersError.message}</Text>;

    return (
        <Box as="form" onSubmit={handleSubmit} borderWidth="1px" borderRadius="lg" p={6} shadow="sm">
            <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Group Selection */}
                    <FormControl isRequired>
                        <FormLabel>Group</FormLabel>
                        <Select
                            placeholder="Select group"
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            isDisabled={isLoadingGroups}
                        >
                            {isLoadingGroups && <option>Loading...</option>}
                            {(groups as AdminGroup[])?.map((group) => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </Select>
                    </FormControl>

                    {/* User Selection */}
                    <FormControl isRequired>
                        <FormLabel>User</FormLabel>
                        <Select
                            placeholder={selectedGroupId ? "Select user" : "Select group first"}
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            isDisabled={isLoadingUsers || !selectedGroupId} // Disable if no group selected or loading
                        >
                            {/* Show loading state specifically when group is selected but users are loading */}
                            {selectedGroupId && isLoadingUsers && <option>Loading users...</option>}
                            {selectedGroupId && usersError && <option disabled>Error loading users</option>}
                            {(usersForSelectedGroup as AdminUser[])?.map((user) => (
                                <option key={user.id} value={user.id}>{user.username}</option>
                            ))}
                            {selectedGroupId && !isLoadingUsers && !usersError && usersForSelectedGroup.length === 0 && (
                                <option disabled>No users found in this group</option>
                            )}
                        </Select>
                    </FormControl>
                </SimpleGrid>

                {/* Date Selection */}
                <FormControl isRequired>
                    <FormLabel>Date</FormLabel>
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)} // Value is already YYYY-MM-DD
                        // Optional: Define min/max based on playoff dates if desired
                        // min={PLAYOFF_START_DATE}
                        // max={PLAYOFF_END_DATE}
                    />
                </FormControl>

                <Divider my={2} />

                {/* Player Selection - Use TypeaheadInput */}
                <FormControl isRequired isInvalid={!!playersError}>
                    <FormLabel>Player</FormLabel>
                    {playersError ? (
                        <FormErrorMessage>Error loading players: {playersError.message}</FormErrorMessage>
                    ) : (
                        <TypeaheadInput
                            placeholder="Search & select player..."
                            options={playerOptions}
                            isLoading={isLoadingPlayers}
                            onSelect={(option) => setSelectedPlayer(option)}
                            value={selectedPlayer}
                            label="Select Player"
                        />
                    )}
                    {!selectedDate && <Text fontSize="xs" color="gray.500" mt={1}>Select a date first</Text>}
                </FormControl>

                {/* Submission Error Display */}
                {submissionError && (
                    <FormControl isInvalid>
                        <FormErrorMessage>{submissionError.message}</FormErrorMessage>
                    </FormControl>
                )}

                {/* Submit Button */}
                <Button
                    mt={4}
                    type="submit"
                    colorScheme="orange"
                    isLoading={isSubmitting}
                    isDisabled={isSubmitting || !selectedGroupId || !selectedUserId || !selectedDate || !selectedPlayer?.id || isLoadingPlayers}
                >
                    Upsert Submission
                </Button>
            </VStack>
        </Box>
    );
};

export default AdminInterface; 