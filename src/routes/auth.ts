import {Router} from 'express';
import authController from '../controllers/authController.js'

const router = Router();

router.get('/spotify/login',authController.spotifyLogIn)
router.get('/spotify/callback',authController.spotifyCallback)
router.get('/spotify/refresh-token',authController.spotifyRefreshToken)

export default router;

