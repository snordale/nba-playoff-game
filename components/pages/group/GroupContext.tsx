import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { useSession } from 'next-auth/react';
import { format, parseISO, startOfDay as dateFnsStartOfDay, isBefore } from 'date-fns';
import { useGetGroup, useCreateSubmission, queryClient } from '@/react-query/queries';
import { type SubmissionView, type ScoredGroupUser } from '@/utils/submission-utils';
import { useToast } from '@chakra-ui/react';

interface GroupContextType {
    // Data
    group: any;
    groupId: string;
    leaderboardUsers: ScoredGroupUser[] | undefined;
    gameCountsByDate: { [key: string]: number } | undefined;
    submissionsByDate: { [key: string]: SubmissionView[] } | undefined;
    previouslySubmittedPlayerIdsForCurrentUser: string[] | undefined;

    // UI State
    selectedDate: string;
    search: string;
    isDayModalOpen: boolean;
    viewMode: 'calendar' | 'list';

    // Current User Info
    currentUserId: string | undefined;
    currentUserUsername: string | undefined;
    userInGroup: boolean;

    // Loading States
    isLoadingGroup: boolean;

    // Actions
    setSelectedDate: (date: string) => void;
    setSearch: (search: string) => void;
    setIsDayModalOpen: (isOpen: boolean) => void;
    setViewMode: (mode: 'calendar' | 'list') => void;
    handleDayClick: (date: Date | string) => void;
    onSubmit: (data: { gameId: string; playerId: string }) => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

interface GroupProviderProps extends PropsWithChildren {
    groupId: string;
}

export function GroupProvider({ children, groupId }: GroupProviderProps) {
    const { data: sessionData } = useSession();
    const currentUserId = sessionData?.user?.id;
    const currentUserUsername = sessionData?.user?.name;
    const toast = useToast();

    // UI State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

    // Data Fetching
    const { data: groupData, isLoading: isLoadingGroup } = useGetGroup({ groupId });
    const { mutate: createSubmission } = useCreateSubmission();

    // Derived Data from API Response
    const group = groupData?.group;
    const leaderboardUsers = groupData?.leaderboardUsers;
    const gameCountsByDate = groupData?.gameCountsByDate;
    const submissionsByDate = groupData?.submissionsByDate;
    const previouslySubmittedPlayerIdsForCurrentUser = groupData?.previouslySubmittedPlayerIdsForCurrentUser;
    
    const userInGroup = useMemo(() => {
        return leaderboardUsers?.some(p => p.userId === currentUserId);
    }, [leaderboardUsers, currentUserId]);

    // Actions
    const handleDayClick = (date: string) => {
        const clickedDay = typeof date === 'string' ? parseISO(date) : date;

        const hasGames = groupData?.gameCountsByDate?.[date] > 0;
        const isPast = isBefore(dateFnsStartOfDay(clickedDay), dateFnsStartOfDay(new Date()));

        if (hasGames || isPast) {
            setSelectedDate(date);
            setIsDayModalOpen(true);
        } else {
            toast({
                title: "No games scheduled",
                description: "There are no games scheduled for this date.",
                status: "info",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const onSubmit = async ({ gameId, playerId }) => {
        return new Promise<void>((resolve, reject) => {
            createSubmission({ gameId, playerId }, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["getGroup", groupId] });
                    setIsDayModalOpen(false);
                    resolve();
                },
                onError: (error) => {
                    reject(error);
                }
            });
        });
    };

    const value: GroupContextType = {
        // Data
        group,
        groupId,
        leaderboardUsers,
        gameCountsByDate,
        submissionsByDate,
        previouslySubmittedPlayerIdsForCurrentUser,

        // UI State
        selectedDate,
        search,
        isDayModalOpen,
        viewMode,

        // Current User Info
        currentUserId,
        currentUserUsername,
        userInGroup,

        // Loading States
        isLoadingGroup,

        // Actions
        setSelectedDate,
        setSearch,
        setIsDayModalOpen,
        setViewMode,
        handleDayClick,
        onSubmit,
    };

    return (
        <GroupContext.Provider value={value}>
            {children}
        </GroupContext.Provider>
    );
}

export function useGroup() {
    const context = useContext(GroupContext);
    if (context === undefined) {
        throw new Error('useGroup must be used within a GroupProvider');
    }
    return context;
} 