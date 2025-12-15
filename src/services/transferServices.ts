import axios from 'axios';
import { config } from '../config/config.js';

interface SpotifyTrack {
    track: {
        name: string;
        artists: { name: string }[];
        album: { name: string };
        external_ids: { isrc?: string };
        uri: string;
    }
}

interface AppleMusicTrack {
    id: string;
    attributes: {
        name: string;
        artistName: string;
        albumName: string;
        isrc: string;
    }
}

export async function transferSpotifyToAppleMusic(
    playlistId: string,
    spotifyAccessToken: string,
    appleDevToken: string,
    appleUserToken: string,
    onProgress: (current: number, total: number, message: string) => void
) {
    try {
        console.log(`[TRANSFER] Starting Spotify -> Apple Music transfer for playlist: ${playlistId}`);

        // 1. Get Spotify Playlist Details
        console.log('[TRANSFER] Fetching Spotify playlist details');
        onProgress(0, 0, "Fetching playlist details...");
        const playlistResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            headers: { Authorization: `Bearer ${spotifyAccessToken}` }
        });
        const playlistName = playlistResponse.data.name;
        console.log(`[TRANSFER] Playlist name: ${playlistName}`);

        // 2. Get Spotify Playlist Tracks
        console.log('[TRANSFER] Fetching Spotify playlist tracks');
        onProgress(0, 0, "Fetching tracks...");
        let tracks: SpotifyTrack[] = [];
        let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

        while (nextUrl) {
            const tracksResponse = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${spotifyAccessToken}` }
            });
            tracks = tracks.concat(tracksResponse.data.items);
            nextUrl = tracksResponse.data.next;
        }
        console.log(`[TRANSFER] Found ${tracks.length} tracks in Spotify playlist`);

        // Filter out empty tracks
        tracks = tracks.filter(t => t.track);
        const totalTracks = tracks.length;

        // 3. Search and Match on Apple Music
        console.log('[TRANSFER] Matching tracks on Apple Music...');
        const appleTrackIds: { id: string, type: string }[] = [];

        for (let i = 0; i < tracks.length; i++) {
            const item = tracks[i];
            if (!item?.track) continue;
            onProgress(i + 1, totalTracks, `Matching: ${item.track.name}`);

            const isrc = item.track.external_ids?.isrc;
            let found = false;

            // Strategy A: Search by ISRC
            if (isrc) {
                try {
                    const searchUrl = `https://api.music.apple.com/v1/catalog/tr/songs?filter[isrc]=${isrc}`;
                    const searchResponse = await axios.get(searchUrl, {
                        headers: { Authorization: `Bearer ${appleDevToken}` }
                    });

                    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
                        appleTrackIds.push({ id: searchResponse.data.data[0].id, type: 'songs' });
                        found = true;
                    }
                } catch (e: any) {
                    console.warn(`[TRANSFER] ISRC search failed for ${item.track.name}:`, e.message);
                }
            }

            // Strategy B: Search by Name + Artist (Fallback)
            if (!found) {
                try {
                    const query = encodeURIComponent(`${item.track.name} ${item.track.artists[0]?.name || ''}`);
                    const searchUrl = `https://api.music.apple.com/v1/catalog/tr/search?term=${query}&types=songs&limit=1`;
                    const searchResponse = await axios.get(searchUrl, {
                        headers: { Authorization: `Bearer ${appleDevToken}` }
                    });

                    if (searchResponse.data.results?.songs?.data?.length > 0) {
                        appleTrackIds.push({ id: searchResponse.data.results.songs.data[0].id, type: 'songs' });
                        found = true;
                    }
                } catch (e: any) {
                    console.warn(`[TRANSFER] Keyword search failed for ${item.track.name}:`, e.message);
                }
            }

            if (!found) {
                console.log(`[TRANSFER] No match found for: ${item.track.name} - ${item.track.artists[0]?.name}`);
            }
        }
        console.log(`[TRANSFER] Matched ${appleTrackIds.length} tracks on Apple Music`);

        if (appleTrackIds.length === 0) {
            console.warn('[TRANSFER] No tracks matched, skipping playlist creation.');
            onProgress(totalTracks, totalTracks, "No tracks matched. Transfer skipped.");
            return;
        }

        // 4. Create Apple Music Playlist
        console.log('[TRANSFER] Creating new playlist on Apple Music');
        onProgress(totalTracks, totalTracks, "Creating playlist on Apple Music...");

        const createPlaylistUrl = 'https://api.music.apple.com/v1/me/library/playlists';
        const createPayload = {
            attributes: {
                name: playlistName,
                description: `Transferred from Spotify using ListBridge`
            },
            relationships: {
                tracks: {
                    data: appleTrackIds
                }
            }
        };

        await axios.post(createPlaylistUrl, createPayload, {
            headers: {
                Authorization: `Bearer ${appleDevToken}`,
                'Music-User-Token': appleUserToken,
                'Content-Type': 'application/json'
            }
        });

        console.log('[TRANSFER] Spotify -> Apple Music transfer completed successfully');
        onProgress(totalTracks, totalTracks, "Transfer Complete!");

    } catch (error) {
        console.error('[TRANSFER] Error in transferSpotifyToAppleMusic:', error);
        throw error;
    }
}

export async function transferAppleMusicToSpotify(
    playlistId: string,
    spotifyAccessToken: string,
    appleDevToken: string,
    appleUserToken: string,
    onProgress: (current: number, total: number, message: string) => void
) {
    try {
        console.log(`[TRANSFER] Starting Apple Music -> Spotify transfer for playlist: ${playlistId}`);

        // 1. Get Apple Music Playlist Details & Tracks
        console.log('[TRANSFER] Fetching Apple Music playlist tracks');
        onProgress(0, 0, "Fetching playlist tracks...");

        let playlistName = "";
        let tracks: AppleMusicTrack[] = [];
        let totalTracks = 0;

        try {
            // A. Try Library First
            console.log('[TRANSFER] Attempting to fetch from Library...');
            const playlistResponse = await axios.get(`https://api.music.apple.com/v1/me/library/playlists/${playlistId}/tracks`, {
                headers: {
                    Authorization: `Bearer ${appleDevToken}`,
                    'Music-User-Token': appleUserToken
                }
            });

            const playlistAttributesResponse = await axios.get(`https://api.music.apple.com/v1/me/library/playlists/${playlistId}`, {
                headers: {
                    Authorization: `Bearer ${appleDevToken}`,
                    'Music-User-Token': appleUserToken
                }
            });

            playlistName = playlistAttributesResponse.data.data[0].attributes.name;
            tracks = playlistResponse.data.data;
            totalTracks = tracks.length;
            console.log(`[TRANSFER] Found in Library. Playlist: ${playlistName}, Tracks: ${totalTracks}`);

        } catch (libraryError: any) {
            console.warn('[TRANSFER] Library fetch failed, trying Catalog...', libraryError.response?.status);

            // B. Try Catalog Fallback
            // Some regions might return 403 or 400 for resources not in library
            if (libraryError.response?.status === 404 || libraryError.response?.status === 400 || libraryError.response?.status === 403) {
                try {
                    // 1. Get Storefront
                    const storefrontResponse = await axios.get('https://api.music.apple.com/v1/me/storefront', {
                        headers: {
                            Authorization: `Bearer ${appleDevToken}`,
                            'Music-User-Token': appleUserToken
                        }
                    });

                    const storefront = storefrontResponse.data.data[0].id; // e.g., 'tr', 'us'
                    console.log(`[TRANSFER] Detected Storefront: ${storefront}`);

                    // 2. Get Catalog Playlist
                    const catalogPlaylistResponse = await axios.get(`https://api.music.apple.com/v1/catalog/${storefront}/playlists/${playlistId}`, {
                        headers: { Authorization: `Bearer ${appleDevToken}` }
                    });

                    playlistName = catalogPlaylistResponse.data.data[0].attributes.name;

                    // 3. Get Catalog Tracks
                    // Note: Catalog tracks might be paginated, for now getting the collection from the main response or separate endpoint
                    // Usually detailed playlist response includes `relationships.tracks.data`
                    // Or we can hit /tracks endpoint if strict consistency is needed.
                    // Let's use the explicit tracks endpoint for consistency with pagination support if we added it later.

                    const catalogTracksResponse = await axios.get(`https://api.music.apple.com/v1/catalog/${storefront}/playlists/${playlistId}/tracks`, {
                        headers: { Authorization: `Bearer ${appleDevToken}` }
                    });

                    tracks = catalogTracksResponse.data.data;
                    totalTracks = tracks.length;
                    console.log(`[TRANSFER] Found in Catalog. Playlist: ${playlistName}, Tracks: ${totalTracks}`);

                } catch (catalogError: any) {
                    console.error('[TRANSFER] Catalog fetch also failed:', catalogError.message);
                    throw new Error('Playlist not found in Library or Catalog');
                }
            } else {
                throw libraryError;
            }
        }

        // 2. Search and Match on Spotify
        console.log('[TRANSFER] Matching tracks on Spotify...');
        const spotifyUris: string[] = [];

        for (let i = 0; i < tracks.length; i++) {
            const item = tracks[i];
            if (!item) continue;
            onProgress(i + 1, totalTracks, `Matching: ${item.attributes.name}`);

            const isrc = item.attributes.isrc;
            let found = false;

            // Strategy A: Search by ISRC
            if (isrc) {
                try {
                    const searchResponse = await axios.get(`https://api.spotify.com/v1/search?type=track&q=isrc:${isrc}`, {
                        headers: { Authorization: `Bearer ${spotifyAccessToken}` }
                    });

                    if (searchResponse.data.tracks.items.length > 0) {
                        spotifyUris.push(searchResponse.data.tracks.items[0].uri);
                        found = true;
                    }
                } catch (e: any) {
                    console.warn(`[TRANSFER] Spotify ISRC search failed for ${item.attributes.name}:`, e.message);
                }
            }

            // Strategy B: Search by Name + Artist
            if (!found) {
                try {
                    const query = `track:${item.attributes.name} artist:${item.attributes.artistName}`;
                    const searchResponse = await axios.get(`https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=1`, {
                        headers: { Authorization: `Bearer ${spotifyAccessToken}` }
                    });

                    if (searchResponse.data.tracks.items.length > 0) {
                        spotifyUris.push(searchResponse.data.tracks.items[0].uri);
                        found = true;
                    }
                } catch (e: any) {
                    console.warn(`[TRANSFER] Spotify keyword search failed for ${item.attributes.name}:`, e.message);
                }
            }

            if (!found) {
                console.log(`[TRANSFER] No match found for: ${item.attributes.name} - ${item.attributes.artistName}`);
            }
        }

        console.log(`[TRANSFER] Matched ${spotifyUris.length} tracks on Spotify`);

        if (spotifyUris.length === 0) {
            console.warn('[TRANSFER] No tracks matched, skipping playlist creation.');
            onProgress(totalTracks, totalTracks, "No tracks matched. Transfer skipped.");
            return;
        }

        // 3. Create Spotify Playlist
        console.log('[TRANSFER] Creating new playlist on Spotify');
        onProgress(totalTracks, totalTracks, "Creating playlist on Spotify...");

        const userProfile = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${spotifyAccessToken}` }
        });
        const userId = userProfile.data.id;

        const createPlaylistResponse = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            name: playlistName,
            description: "Transferred from Apple Music using ListBridge",
            public: false
        }, {
            headers: { Authorization: `Bearer ${spotifyAccessToken}` }
        });

        const newPlaylistId = createPlaylistResponse.data.id;

        // 4. Add Tracks to Spotify Playlist (in chunks of 100)
        console.log('[TRANSFER] Adding tracks to Spotify playlist');
        const chunkSize = 100;
        for (let i = 0; i < spotifyUris.length; i += chunkSize) {
            const chunk = spotifyUris.slice(i, i + chunkSize);
            await axios.post(`https://api.spotify.com/v1/playlists/${newPlaylistId}/tracks`, {
                uris: chunk
            }, {
                headers: { Authorization: `Bearer ${spotifyAccessToken}` }
            });
        }

        console.log('[TRANSFER] Apple Music -> Spotify transfer completed successfully');
        onProgress(totalTracks, totalTracks, "Transfer Complete!");

    } catch (error) {
        console.error('[TRANSFER] Error in transferAppleMusicToSpotify:', error);
        throw error;
    }
}

export default {
    transferSpotifyToAppleMusic,
    transferAppleMusicToSpotify,
};