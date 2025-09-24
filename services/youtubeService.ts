import type { VideoDetails } from '../types';

const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

const getApiKey = (): string => {
    if (!process.env.YOUTUBE_API_KEY) {
        throw new Error("YOUTUBE_API_KEY environment variable not set.");
    }
    return process.env.YOUTUBE_API_KEY;
}

export const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const getVideoDetails = async (videoId: string): Promise<VideoDetails> => {
  const apiKey = getApiKey();
  const url = `${API_BASE_URL}/videos?id=${videoId}&part=snippet&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.items && data.items.length > 0) {
    const snippet = data.items[0].snippet;
    return {
      id: videoId,
      title: snippet.title,
      thumbnailUrl: snippet.thumbnails.high.url,
    };
  } else {
    if (data.error && data.error.errors[0].reason === 'keyInvalid') {
        throw new Error('The provided API key is invalid for YouTube Data API.');
    }
    throw new Error('Video not found or API error.');
  }
};

export const getComments = async (videoId: string): Promise<string[]> => {
  const apiKey = getApiKey();
  let comments: string[] = [];
  let nextPageToken: string | undefined = undefined;

  try {
    do {
      const url = `${API_BASE_URL}/commentThreads?videoId=${videoId}&part=snippet&maxResults=100&textFormat=plainText&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
          if (data.error.errors[0].reason === 'commentsDisabled') {
              throw new Error("Comments are disabled for this video.");
          }
          if (data.error.errors[0].reason === 'keyInvalid') {
            throw new Error('The provided API key is invalid for YouTube Data API.');
          }
          throw new Error(data.error.message || "Failed to fetch comments.");
      }

      if (data.items) {
        comments = comments.concat(
          data.items.map(
            (item: any) => item.snippet.topLevelComment.snippet.textDisplay
          )
        );
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken && comments.length < 200); // Limit to ~200 comments to be reasonable

    return comments;
  } catch (error) {
    console.error("Error fetching comments:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while fetching comments.");
  }
};