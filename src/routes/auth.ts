import {Router} from 'express';
import authController from '../controllers/authController.js'

const router = Router();

router.get('/spotify/login',authController.spotifyLogIn)
router.get('/spotify/callback',authController.spotifyCallback)

export default router;

