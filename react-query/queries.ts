import {
  createGroup,
  createSubmission,
  createSeriesPick,
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
import type { Season } from "@prisma/client";
import type { BlogPost } from "@prisma/client";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";

export const queryClient = new QueryClient();

// Define types for mutation variables
interface CreateGroupVariables { groupName: string }
interface JoinGroupVariables { groupId: string; token: string }
interface CreateSubmissionVariables { gameId: string; playerId: string; groupId: string }
interface CreateSeriesPickVariables {
  groupId: string;
  seriesId: string;
  winnerTeamId: string;
  gamesCount: number;
}
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
    mutationFn: ({ groupId, token }) => joinGroup({ groupId, token }),
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

export const useCreateSeriesPick = () =>
  useMutation<unknown, Error, CreateSeriesPickVariables>({
    mutationFn: createSeriesPick,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getGroup", variables.groupId] });
    },
  });

export const useGetGroups = () =>
  useQuery({
    queryKey: ["getGroups"],
    queryFn: getGroups,
  });

export const useGetSeasons = () =>
  useQuery<Season[]>({
    queryKey: ["getSeasons"],
    queryFn: async () => {
      const res = await fetch("/api/seasons");
      if (!res.ok) throw new Error("Failed to fetch seasons");
      return res.json();
    },
  });

export const useGetGroup = ({
  groupId,
  season,
}: {
  groupId: string;
  season?: number;
}) => {
  return useQuery({
    queryKey: ["getGroup", groupId, season],
    queryFn: () => getGroup({ groupId, season }),
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
