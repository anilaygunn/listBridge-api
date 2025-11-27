import type {Request, Response} from 'express';
import spotifyService from '../services/spotifyServices.js'


const spotifyLogIn = (req: Request,res: Response) : void =>{
    try{
        const authURL = spotifyService.getSpotifyURL();
        res.json({ authURL : authURL });
    }catch{
        console.error('Error redirecting to Spotify login page');
        res.status(500).json({error: 'Internal server error'});
    }
}

const spotifyCallback = async (req: Request,res: Response) : Promise<void> =>{
    try {
        const { code, state } = req.query;
        if (!state || !code) {
            res.status(400).json({error: 'Missing state or code'});
            return;
        }
        const callbackResult = await spotifyService.getSpotifyCallback(code as string, state as string, {
            clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
            redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? '', 
        });
        if (!callbackResult.ok) {
            res.status(400).json({error: 'Failed to exchange token'});
            return;
        }
        res.json({ accessToken: callbackResult.accessToken, refreshToken: callbackResult.refreshToken, expiresIn: callbackResult.expiresIn });
    }catch{
        console.error('Error exchanging token');
        res.status(500).json({error: 'Internal server error'});
    }
}

const spotifyRefreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refresh_token } = req.query;
        
        if (!refresh_token) {
            res.status(400).json({ error: 'Missing refresh_token' });
            return;
        }

        const result = await spotifyService.refreshSpotifyToken(refresh_token as string, {
            clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
            redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? '',
        });

        if (!result.ok) {
            res.status(400).json({ error: 'Failed to refresh token' });
            return;
        }

        res.json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    } catch {
        console.error('Error refreshing token');
        res.status(500).json({ error: 'Internal server error' });
    }
};

export default {
    spotifyLogIn,
    spotifyCallback,
    spotifyRefreshToken
}