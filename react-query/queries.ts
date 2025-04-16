import {
  createGroup,
  createSubmission,
  generateInviteLink,
  getBlogPosts,
  getGames,
  getGroup,
  getGroups,
  getPlayers,
  joinGroup
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

// Hook for fetching blog posts
export const useGetBlogPosts = () => {
  return useQuery<BlogPost[], Error>({
    queryKey: ["getBlogPosts"],
    queryFn: () => getBlogPosts(),
  });
};

// Hook for fetching a single blog post by slug
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
    enabled: !!slug, // Only run the query if slug is provided
  });
}

// Hook for generating a group invite link
export const useGenerateInviteLink = () =>
  useMutation<GenerateInviteResponse, Error, GenerateInviteVariables>({
    mutationFn: generateInviteLink,
    // Optional: onSuccess/onError handling if needed
  });
