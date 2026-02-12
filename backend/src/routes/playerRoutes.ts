import { Router } from 'express';
import { getPlayers, createPlayer, getPlayerProfile, updatePlayer } from '../controllers/playerController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getPlayers);
router.post('/', authenticate, createPlayer);
router.patch('/:id', authenticate, updatePlayer);
router.get('/:id', authenticate, getPlayerProfile);

export default router;