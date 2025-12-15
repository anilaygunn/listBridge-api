import axios, { type AxiosResponse } from 'axios';
import querystring from 'querystring';
import { config } from '../config/config.js';

type SpotifyState = string & { readonly brand: unique symbol };
type SpotifyCode = string & { readonly brand: unique symbol };

type SpotifyCallbackSuccess = {
  ok: true;
  state: SpotifyState;
  code: SpotifyCode;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type SpotifyCallbackFailure =
  | { ok: false; reason: 'state_mismatch' }
  | { ok: false; reason: 'token_exchange_failed'; details?: unknown };

export type SpotifyCallbackResult = SpotifyCallbackSuccess | SpotifyCallbackFailure;

type SpotifyCredentials = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}>;

const SPOTIFY_SCOPE = [
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-library-modify',
] as const;

function generateRandomString(length: number): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
  ).join('');
}

export function getSpotifyURL(): string {
  console.log('[SERVICE] Generating Spotify authorization URL');
  const state = generateRandomString(16) as SpotifyState;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.spotify.clientId,
    scope: SPOTIFY_SCOPE.join(' '),
    redirect_uri: config.spotify.redirectUri,
    state,
    show_dialog: 'false',
  });

  const authURL = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log('[SERVICE] Spotify authorization URL generated with state:', state);
  return authURL;
}

export async function getSpotifyCallback(
  code: string | null,
  state: string | null,
  credentials: SpotifyCredentials,
): Promise<SpotifyCallbackResult> {
  console.log('[SERVICE] Processing Spotify callback with code and state');
  
  if (!state) {
    console.error('[SERVICE] Spotify callback failed: state is missing');
    return { ok: false, reason: 'state_mismatch' };
  }
  if (!code) {
    console.error('[SERVICE] Spotify callback failed: code is missing');
    return { ok: false, reason: 'token_exchange_failed' };
  }

  const { clientId, clientSecret, redirectUri } = credentials;

  const body = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const headers = {
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    )}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  try {
    console.log('[SERVICE] Exchanging Spotify authorization code for tokens');
    const response: AxiosResponse<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }> = await axios.post('https://accounts.spotify.com/api/token', body, {
      headers,
    });

    console.log('[SERVICE] Spotify token exchange successful, expires in:', response.data.expires_in, 'seconds');
    return {
      ok: true,
      state: state as SpotifyState,
      code: code as SpotifyCode,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      console.error('[SERVICE] Spotify token exchange failed:', {
        status,
        message: error.message,
        errorData: errorData || 'No error data'
      });
    } else {
      console.error('[SERVICE] Spotify token exchange failed:', error instanceof Error ? error.message : error);
    }
    return {
      ok: false,
      reason: 'token_exchange_failed',
      details: error instanceof Error ? error.message : error,
    };
  }
  
}
export async function refreshSpotifyToken(
  refreshToken: string,
  credentials: SpotifyCredentials
) {
  console.log('[SERVICE] Refreshing Spotify access token');
  const { clientId, clientSecret } = credentials;

  const body = querystring.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const headers = {
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  try {
    const response: AxiosResponse<{
      access_token: string;
      refresh_token?: string;
    }> = await axios.post('https://accounts.spotify.com/api/token', body, {
      headers,
    });

    const hasNewRefreshToken = !!response.data.refresh_token;
    console.log('[SERVICE] Spotify token refresh successful', hasNewRefreshToken ? '(new refresh token provided)' : '(using existing refresh token)');
    
    return {
      ok: true as const,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      console.error('[SERVICE] Spotify token refresh failed:', {
        status,
        message: error.message,
        errorData: errorData || 'No error data'
      });
    } else {
      console.error('[SERVICE] Spotify token refresh failed:', error instanceof Error ? error.message : error);
    }
    
    return {
      ok: false as const,
      reason: 'token_refresh_failed',
      details: error instanceof Error ? error.message : error,
    };
  }
}

export default {
  getSpotifyURL,
  getSpotifyCallback,
  refreshSpotifyToken,
};