import {
  createGroup,
  createSubmission,
  getGroup,
  getGroups,
  getTodaysPlayers,
  joinGroup,
} from "@/services/ApiService";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";

export const queryClient = new QueryClient();

// Define types for mutation variables
interface CreateGroupVariables { groupName: string }
interface JoinGroupVariables { groupId: string }
interface CreateSubmissionVariables { gameId: string; playerId: string }

// Rename useCreateLeague to useCreateGroup and add type
export const useCreateGroup = () =>
  useMutation<unknown, Error, CreateGroupVariables>({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getGroups"] });
    },
  });

// Rename useJoinLeague to useJoinGroup and add type
export const useJoinGroup = () =>
  useMutation<unknown, Error, JoinGroupVariables>({
    mutationFn: joinGroup,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getGroup", variables.groupId] });
    },
  });

// Add type to useCreateSubmission
export const useCreateSubmission = () =>
  useMutation<unknown, Error, CreateSubmissionVariables>({
    mutationFn: createSubmission,
    onSuccess: (data, variables) => {
      // Attempt to invalidate the specific group the submission belongs to
      // This requires getting the groupId from the submission response or variables
      // For now, just invalidate all groups as a simpler approach
      queryClient.invalidateQueries({ queryKey: ["getGroup"] });
    },
  });

export const useGetGroups = () =>
  useQuery({
    queryKey: ["getGroups"],
    queryFn: getGroups,
  });

export const useGetGroup = ({ groupId }) => {
  return useQuery({
    queryKey: ["getGroup", groupId],
    queryFn: () => getGroup({ groupId }),
    enabled: !!groupId,
  });
};

export const useGetTodaysPlayers = ({ date }) => {
  return useQuery({
    queryKey: ["getTodaysPlayers", date.toString()],
    queryFn: () => getTodaysPlayers({ date }),
  });
};
