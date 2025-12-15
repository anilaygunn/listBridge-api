import {Router} from 'express';
import authRoutes from './auth.js';
import transferRoutes from './transfer.js';
import playlistRoutes from './playlists.js';

const router = Router();

router.use('/auth',authRoutes);
router.use('/transfer',transferRoutes);
router.use('/playlists',playlistRoutes);

export default router;