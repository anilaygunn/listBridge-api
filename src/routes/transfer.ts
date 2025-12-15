import {Router} from 'express';
import transferController from '../controllers/transferController.js';

const router = Router();

router.post('/spotify-to-apple-music', transferController.transferSpotifyToAppleMusic);
router.post('/apple-music-to-spotify', transferController.transferAppleMusicToSpotify);

export default router;