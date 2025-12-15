import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export function generateDeveloperToken(): { token: string; expiresAt: Date } {
  try {
    console.log('[SERVICE] Generating Apple Music developer token');
    const teamId = config.apple.teamId;
    const keyId = config.apple.keyId;
    const privateKey = config.apple.privateKey;

    if (!teamId || !keyId || !privateKey) {
      const missing = [];
      if (!teamId) missing.push('teamId');
      if (!keyId) missing.push('keyId');
      if (!privateKey) missing.push('privateKey');
      console.error('[SERVICE] Missing Apple Music configuration:', missing.join(', '));
      throw new Error('Missing Apple Music configuration. Please check your .env file.');
    }

    console.log('[SERVICE] Apple Music config validated:', { teamId, keyId, hasPrivateKey: !!privateKey });

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15777000; 

    const payload = {
      iss: teamId,
      iat: now,
      exp: now + expiresIn,
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    console.log('[SERVICE] Apple Music developer token generated successfully, token:', token);
    console.log('[SERVICE] Apple Music developer token generated successfully, expires at:', expiresAt.toISOString());

    return {
      token,
      expiresAt,
    };
  } catch (error) {
    console.error('[SERVICE] Error generating Apple Music developer token:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('[SERVICE] Stack trace:', error.stack);
    }
    throw error;
  }
}

export default {
  generateDeveloperToken,
};