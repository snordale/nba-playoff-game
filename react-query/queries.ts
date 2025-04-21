import {
  createGroup,
  createSubmission,
  generateInviteLink,
  getBlogPosts,
  getGames,
  getGroup,
  getGroups,
  getPlayers,
  joinGroup,
  adminGetAllGroups,
  adminGetAllUsers,
  adminUpsertSubmission,
} from "@/services/ApiService";
import type { BlogPost } from "@prisma/client";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";

export const queryClient = new QueryClient();

// Define types for mutation variables
interface CreateGroupVariables { groupName: string }
interface JoinGroupVariables { groupId: string }
interface CreateSubmissionVariables { gameId: string; playerId: string }
interface GenerateInviteVariables { groupId: string }
interface GenerateInviteResponse { inviteUrl: string }
interface AdminUpsertSubmissionVariables {
  userId: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  playerId: string;
}

export const useCreateGroup = () =>
  useMutation<unknown, Error, CreateGroupVariables>({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getGroups"] });
    },
  });

export const useJoinGroup = () =>
  useMutation<unknown, Error, JoinGroupVariables>({
    mutationFn: joinGroup,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getGroup", variables.groupId] });
    },
  });

export const useCreateSubmission = () =>
  useMutation<unknown, Error, CreateSubmissionVariables>({
    mutationFn: createSubmission,
    onSuccess: (data, variables) => {
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

export const useGetPlayers = ({ date }) => {
  return useQuery({
    queryKey: ["getPlayers", date],
    queryFn: () => getPlayers({ date }),
    enabled: !!date,
  });
};

export const useGetGames = ({ date }: { date: string }) => {
  return useQuery({
    queryKey: ["getGames", date],
    queryFn: () => getGames({ date }),
    enabled: !!date,
  });
};

export const useGetBlogPosts = () => {
  return useQuery<BlogPost[], Error>({
    queryKey: ["getBlogPosts"],
    queryFn: () => getBlogPosts(),
  });
};

export const useGetBlogPost = (slug: string | null | undefined) => {
  return useQuery<BlogPost, Error>({
    queryKey: ["getBlogPost", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required to fetch blog post");
      const response = await fetch(`/api/blog/posts/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Blog post not found');
        }
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    enabled: !!slug,
  });
}

export const useGenerateInviteLink = () =>
  useMutation<GenerateInviteResponse, Error, GenerateInviteVariables>({
    mutationFn: generateInviteLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getGroup"] });
    },
  });

export const useAdminGetAllGroups = () => {
  return useQuery({
    queryKey: ["adminGetAllGroups"],
    queryFn: adminGetAllGroups,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useAdminGetAllUsers = ({ groupId }: { groupId?: string }) => {
  return useQuery({
    queryKey: ["adminGetAllUsers", groupId || 'all'],
    queryFn: () => adminGetAllUsers({ groupId }),
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });
};

export const useAdminUpsertSubmission = () => {
  return useMutation<unknown, Error, AdminUpsertSubmissionVariables>({
    mutationFn: adminUpsertSubmission,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getGroup", variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ["getPlayers", variables.date] });
      console.log("Admin submission successful, invalidated group and player queries.");
    },
    onError: (error) => {
        console.error("Admin submission failed:", error);
    }
  });
};
