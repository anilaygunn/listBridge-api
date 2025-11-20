import axios, { type AxiosResponse } from 'axios';
import querystring from 'querystring';

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
  const state = generateRandomString(16) as SpotifyState;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID ?? '',
    scope: SPOTIFY_SCOPE.join(' '),
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? '',
    state,
    show_dialog: 'false',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getSpotifyCallback(
  code: string | null,
  state: string | null,
  credentials: SpotifyCredentials,
): Promise<SpotifyCallbackResult> {
  if (!state) {
    return { ok: false, reason: 'state_mismatch' };
  }
  if (!code) {
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
    const response: AxiosResponse<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }> = await axios.post('https://accounts.spotify.com/api/token', body, {
      headers,
    });

    return {
      ok: true,
      state: state as SpotifyState,
      code: code as SpotifyCode,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'token_exchange_failed',
      details: error instanceof Error ? error.message : error,
    };
  }
}

export default {
  getSpotifyURL,
  getSpotifyCallback,
};