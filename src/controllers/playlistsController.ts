import type { Request, Response } from 'express';
import axios from 'axios';
import playlistsService from '../services/playlistsService.js';
import appleMusicServices from '../services/appleMusicServices.js';

const getSpotifyPlaylists = async (req: Request, res: Response) => {
    try {
        console.log('[PLAYLISTS] Spotify playlists request received');
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            console.warn('[PLAYLISTS] Spotify playlists request missing authorization header');
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }

        const accessToken = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;

        console.log('[PLAYLISTS] Fetching Spotify playlists for user');
        const playlists = await playlistsService.getSpotifyPlaylists(accessToken);

        const playlistCount = playlists?.items?.length || 0;
        console.log(`[PLAYLISTS] Successfully fetched ${playlistCount} Spotify playlists`);
        res.json(playlists);

    } catch (error) {
        console.error('[PLAYLISTS] Error in getSpotifyPlaylists controller:', error instanceof Error ? error.message : error);

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const errorData = error.response?.data;
            console.error('[PLAYLISTS] Spotify API error:', { status, errorData });

            if (status === 401) {
                res.status(401).json({ error: 'Spotify token expired or invalid' });
            } else {
                res.status(status || 500).json({ error: 'Internal server error', details: errorData });
            }
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

const getAppleMusicPlaylists = async (req: Request, res: Response) => {
    try {
        console.log('[PLAYLISTS] Apple Music playlists request received');
        const userToken = req.headers['Music-User-Token'] || req.headers['music-user-token'];
        const devToken = req.headers['Authorization'] || req.headers['authorization'];

        if (!userToken || userToken === '') {
            console.warn('[PLAYLISTS] Apple Music playlists request missing user token');
            res.status(400).json({ error: "User token missing" });
            return;
        }


        if (!devToken || devToken === '') {
            console.error('[PLAYLISTS] Failed to generate Apple Music developer token');
            res.status(400).json({ error: "Developer token missing" });
            return;
        }

        console.log('[PLAYLISTS] Fetching Apple Music playlists for user');
        const playlists = await playlistsService.getAppleMusicPlaylists(
            userToken as string,
            devToken as string
        );

        const playlistCount = playlists?.length || 0;
        console.log(`[PLAYLISTS] Successfully fetched ${playlistCount} Apple Music playlists`);
        res.json(playlists);

    } catch (error) {
        console.error('[PLAYLISTS] Error in getAppleMusicPlaylists controller:', error instanceof Error ? error.message : error);

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const errorData = error.response?.data;
            console.error('[PLAYLISTS] Apple Music API error:', { status, errorData });

            if (status === 401) {
                res.status(401).json({ error: 'Apple Music token expired or invalid' });
            } else if (status === 403) {
                res.status(403).json({
                    error: 'Apple Music authentication failed',
                    details: errorData
                });
            } else {
                res.status(status || 500).json({ error: 'Internal server error', details: errorData });
            }
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default {
    getSpotifyPlaylists,
    getAppleMusicPlaylists
}