import axios, { type AxiosError } from 'axios';

export async function getSpotifyPlaylists(accessToken: string) {
    try {
        console.log('[SERVICE] Requesting Spotify playlists from API');
        const response = await axios.get('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        const playlistCount = response.data?.items?.length || 0;
        const total = response.data?.total || 0;
        console.log(`[SERVICE] Spotify API response: ${playlistCount} playlists returned (total: ${total})`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const errorData = error.response?.data;
            console.error("[SERVICE] Spotify API Error:", {
                status,
                message: error.message,
                errorData: errorData || 'No error data'
            });
        } else {
            console.error("[SERVICE] Spotify API Error:", error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
    }
}

interface AppleMusicPlaylist {
    id: string;
    type: string;
    href: string;
    attributes: {
        name: string;
        description?: { standard: string };
        artwork?: {
            width: number;
            height: number;
            url: string;
        };
        playParams: {
            id: string;
            kind: string;
            isLibrary: boolean;
        };
        canEdit: boolean;
        isPublic: boolean;
        hasCatalog: boolean;
        dateAdded: string;
    };
    relationships?: {
        tracks?: {
            data: any[];
            meta: { total: number };
        };
    };
    trackCount?: number;
}

export async function getAppleMusicPlaylists(userToken: string, devToken: string): Promise<AppleMusicPlaylist[]> {
    try {
        console.log('[SERVICE] Requesting Apple Music playlists from API');
        const response = await axios.get("https://api.music.apple.com/v1/me/library/playlists",{
            headers: {
                'Authorization': devToken,
                'Music-User-Token': userToken,
            }
        });
        const playlistCount = response.data?.data?.length || 0;

        const playlists = response.data.data as AppleMusicPlaylist[];

        console.log(`[SERVICE] Apple Music API response: ${playlistCount} playlists returned`);
        return playlists;
        
        
    } catch (error) {   
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const errorData = error.response?.data;
            console.error("[SERVICE] Apple Music API Error:", {
                status,
                message: error.message,
                errorData: errorData || 'No error data',
                headers: error.response?.headers
            });
        } else {
            console.error("[SERVICE] Apple Music API Error:", error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
    }
}

export default {
    getSpotifyPlaylists,
    getAppleMusicPlaylists
}