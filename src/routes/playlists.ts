import { Router } from 'express';
import playlistsController from '../controllers/playlistsController.js';

const router = Router();

router.get('/spotify/me', playlistsController.getSpotifyPlaylists);
router.get('/apple-music/me', playlistsController.getAppleMusicPlaylists);

export default router;
