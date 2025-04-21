import axios from "axios";

const apiService = axios.create({
  baseURL: process.env.API_URL,
});

// Helper function for making API requests
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // Add any other default headers like Authorization if needed
    },
  };
  const mergedOptions = { ...defaultOptions, ...options };
  mergedOptions.headers = { ...defaultOptions.headers, ...options.headers };

  const response = await fetch(endpoint, mergedOptions);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use the status text
      errorData = { error: response.statusText || 'Network response was not ok' };
    }
    // Throw an error that includes the response status and message
    const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
    (error as any).response = response; // Attach the full response if needed
    (error as any).data = errorData;
    throw error;
  }

  // Handle cases where the response might be empty (e.g., 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const createGroup = async ({ groupName }: { groupName: string }) => {
  return fetchAPI('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name: groupName }),
  });
};

export const joinGroup = async ({ groupId }: { groupId: string }) => {
  return fetchAPI(`/api/groups/${groupId}/join`, { method: 'POST' });
};

export const createSubmission = async ({ gameId, playerId }: { gameId: string; playerId: string }) => {
  return fetchAPI('/api/submission', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerId }),
  });
};

export const getGroups = async () => {
  return fetchAPI('/api/groups');
};

export const getGroup = async ({ groupId }: { groupId: string }) => {
  return fetchAPI(`/api/groups/${groupId}`);
};

export const getPlayers = async ({ date }: { date: string | null }) => {
  if (!date) return []; // Don't fetch if date is null
  return fetchAPI(`/api/players?date=${date}`);
};

export const getGames = async ({ date }: { date: string }) => {
  return fetchAPI(`/api/games?date=${date}`);
};

export const getBlogPosts = async () => {
  return fetchAPI('/api/blog/posts');
};

export const generateInviteLink = async ({ groupId }: { groupId: string }) => {
  return fetchAPI(`/api/groups/${groupId}/invite`, {
    method: 'POST',
  });
};

// --- Admin API Service Functions ---

export const adminGetAllGroups = async () => {
  // For now, using the existing public route, assuming admins can see all
  console.warn("adminGetAllGroups: Using public /api/groups endpoint.");
  return fetchAPI('/api/groups');
};

// Updated to accept optional groupId
export const adminGetAllUsers = async ({ groupId }: { groupId?: string } = {}) => {
  const endpoint = groupId ? `/api/admin/users?groupId=${groupId}` : '/api/admin/users';
  console.log(`Fetching admin users from: ${endpoint}`);
  try {
      const users = await fetchAPI(endpoint);
      return users || []; // Ensure we return an array even if the response is null/empty
  } catch (error) {
      console.error("Error in adminGetAllUsers:", error);
      // Return empty array on error to prevent breaking UI hooks expecting an array
      return [];
  }
};

export const adminUpsertSubmission = async (
    { userId, groupId, date, playerId }: { userId: string; groupId: string; date: string; playerId: string }
) => {
  return fetchAPI('/api/admin/submission', {
    method: 'POST',
    body: JSON.stringify({ userId, groupId, date, playerId }),
  });
};
