import type {Request, Response} from 'express';
import spotifyService from '../services/spotifyServices.js'
import appleMusicServices from '../services/appleMusicServices.js'
import { config } from '../config/config.js';


const spotifyLogIn = (req: Request,res: Response) : void =>{
    try{
        console.log('[AUTH] Spotify login request received');
        const authURL = spotifyService.getSpotifyURL();
        console.log('[AUTH] Spotify auth URL generated successfully');
        res.json({ authURL : authURL });
    }catch(error){
        console.error('[AUTH] Error redirecting to Spotify login page:', error instanceof Error ? error.message : error);
        res.status(500).json({error: 'Internal server error'});
    }
}

const spotifyCallback = async (req: Request,res: Response) : Promise<void> =>{
    try {
        console.log('[AUTH] Spotify callback request received');
        const { code, state } = req.query;
        
        if (!state || !code) {
            console.warn('[AUTH] Spotify callback missing state or code:', { hasState: !!state, hasCode: !!code });
            res.status(400).json({error: 'Missing state or code'});
            return;
        }
        
        console.log('[AUTH] Exchanging Spotify authorization code for tokens');
        const callbackResult = await spotifyService.getSpotifyCallback(
            code as string,
            state as string,
            {
                clientId: config.spotify.clientId,
                clientSecret: config.spotify.clientSecret,
                redirectUri: config.spotify.redirectUri, 
            }
        );
        
        if (!callbackResult.ok) {
            console.error('[AUTH] Spotify token exchange failed:', callbackResult.reason, callbackResult);
            res.status(400).json({error: 'Failed to exchange token', reason: callbackResult.reason});
            return;
        }
        
        console.log('[AUTH] Spotify token exchange successful, expires in:', callbackResult.expiresIn, 'seconds');
        res.json({ accessToken: callbackResult.accessToken, refreshToken: callbackResult.refreshToken, expiresIn: callbackResult.expiresIn });
    }catch(error){
        console.error('[AUTH] Error exchanging Spotify token:', error instanceof Error ? error.message : error);
        res.status(500).json({error: 'Internal server error'});
    }
}

const spotifyRefreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[AUTH] Spotify refresh token request received');
        const { refresh_token } = req.query;
        
        if (!refresh_token) {
            console.warn('[AUTH] Spotify refresh token request missing refresh_token');
            res.status(400).json({ error: 'Missing refresh_token' });
            return;
        }

        console.log('[AUTH] Refreshing Spotify access token');
        const result = await spotifyService.refreshSpotifyToken(
            refresh_token as string,
            {
                clientId: config.spotify.clientId,
                clientSecret: config.spotify.clientSecret,
                redirectUri: config.spotify.redirectUri,
            }
        );

        if (!result.ok) {
            console.error('[AUTH] Spotify token refresh failed:', result.reason, result);
            res.status(400).json({ error: 'Failed to refresh token', reason: result.reason });
            return;
        }

        console.log('[AUTH] Spotify token refreshed successfully');
        res.json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: 3600
        });
    } catch (error) {
        console.error('[AUTH] Error refreshing Spotify token:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const appleMusicDeveloperToken = (req: Request, res: Response): void => {
    try {
        console.log('[AUTH] Apple Music developer token request received');
        const developerToken = appleMusicServices.generateDeveloperToken();
        console.log('[AUTH] Apple Music developer token generated successfully, expires at:', developerToken.expiresAt);
        res.json({ token: developerToken.token, expiresAt: developerToken.expiresAt });
    } catch (error) {
        console.error('[AUTH] Error generating Apple Music developer token:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export default {
    spotifyLogIn,
    spotifyCallback,
    spotifyRefreshToken,
    appleMusicDeveloperToken
}