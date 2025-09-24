import type { VideoDetails } from '../types';

// This API key was provided by the user in the prompt.
const YOUTUBE_API_KEY = "AIzaSyBDsahT9HZs4SjhIS-3u4AHmaPGZ3YnXZY";

const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export const getVideoDetails = async (videoUrl: string): Promise<VideoDetails> => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
        throw new Error("無効なYouTube URLです。");
    }

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error("YouTube API Error:", errorData);
            throw new Error(errorData.error?.message || "YouTube APIから動画情報の取得に失敗しました。");
        }
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error("動画が見つかりません。URLが正しいか確認してください。");
        }

        const snippet = data.items[0].snippet;
        return {
            id: videoId,
            title: snippet.title,
            thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default.url,
        };
    } catch (error) {
        console.error("Error fetching video details:", error);
        if (error instanceof Error) {
            throw new Error(`動画情報の取得に失敗しました: ${error.message}`);
        }
        throw new Error("動画情報の取得中に不明なエラーが発生しました。");
    }
};

export const getVideoComments = async (videoId: string): Promise<string[]> => {
    if (!videoId) {
        throw new Error("ビデオIDが必要です。");
    }

    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${YOUTUBE_API_KEY}&order=relevance&maxResults=100`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
             if (errorData.error.errors[0].reason === 'commentsDisabled') {
                throw new Error("この動画はコメントがオフになっています。");
            }
            console.error("YouTube API Error (Comments):", errorData);
            throw new Error(errorData.error?.message || "YouTube APIからコメントの取得に失敗しました。");
        }
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            return [];
        }

        return data.items.map((item: any) => item.snippet.topLevelComment.snippet.textDisplay);
    } catch (error) {
        console.error("Error fetching comments:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("コメントの取得中に不明なエラーが発生しました。");
    }
};
