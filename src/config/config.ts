import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export const config = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        env: process.env.NODE_ENV || 'development',
    },
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || '',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
        redirectUri: process.env.SPOTIFY_REDIRECT_URI || '',
    },
    apple: {
        teamId: process.env.APPLE_TEAM_ID || '',
        keyId: process.env.APPLE_MUSIC_KEY_ID || '',
        privateKey: process.env.APPLE_MUSIC_KEY_PATH
            ? fs.readFileSync(process.env.APPLE_MUSIC_KEY_PATH, 'utf8')
            : '',
    },
};