//TODO: Add TRANSFER LOGIC AND REQ RES FUNCS
import type { Request, Response } from 'express';
import transferServices from '../services/transferServices.js';

const transferSpotifyToAppleMusic = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[TRANSFER_CONTROLLER] Received Spotify -> Apple Music transfer request');
        const authHeader = req.headers.authorization;
        const spotifyAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

        const appleDevToken = req.headers['apple-music-developer-token'] as string;
        const appleUserToken = req.headers['apple-music-user-token'] as string;

        const { playlistId } = req.body;

        if (!spotifyAccessToken || !appleDevToken || !appleUserToken || !playlistId) {
            res.status(400).json({ error: 'Missing required tokens or playlistId' });
            return;
        }

        
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        const sendEvent = (data: any) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        await transferServices.transferSpotifyToAppleMusic(
            playlistId,
            spotifyAccessToken,
            appleDevToken,
            appleUserToken,
            (current, total, message) => {
                sendEvent({ status: 'progress', current, total, message });
            }
        );

        sendEvent({ status: 'completed', message: 'Transfer successful' });
        res.end();

    } catch (error: any) {
        console.error('[TRANSFER_CONTROLLER] Error:', error);
        // If headers sent, we can't send 500. We send error event.
        if (!res.headersSent) {
            res.status(500).json({ error: 'Transfer failed' });
        } else {
            res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
            res.end();
        }
    }
}

const transferAppleMusicToSpotify = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[TRANSFER_CONTROLLER] Received Apple Music -> Spotify transfer request');

        const authHeader = req.headers.authorization;
        const spotifyAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

        const appleDevToken = req.headers['apple-music-developer-token'] as string;
        const appleUserToken = req.headers['apple-music-user-token'] as string;

        const { playlistId } = req.body;

        if (!spotifyAccessToken || !appleDevToken || !appleUserToken || !playlistId) {
            res.status(400).json({ error: 'Missing required tokens or playlistId' });
            return;
        }

        // Setup SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        const sendEvent = (data: any) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        await transferServices.transferAppleMusicToSpotify(
            playlistId,
            spotifyAccessToken,
            appleDevToken,
            appleUserToken,
            (current, total, message) => {
                sendEvent({ status: 'progress', current, total, message });
            }
        );

        sendEvent({ status: 'completed', message: 'Transfer successful' });
        res.end();

    } catch (error: any) {
        console.error('[TRANSFER_CONTROLLER] Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Transfer failed' });
        } else {
            res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
            res.end();
        }
    }
}

export default {
    transferSpotifyToAppleMusic,
    transferAppleMusicToSpotify,
};