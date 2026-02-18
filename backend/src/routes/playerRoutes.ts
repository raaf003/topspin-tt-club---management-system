import { Router } from 'express';
import { getPlayers, createPlayer, getPlayerProfile, updatePlayer } from '../controllers/playerController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuthenticate, getPlayers);
router.post('/', authenticate, createPlayer);
router.patch('/:id', authenticate, updatePlayer);
router.get('/:id', optionalAuthenticate, getPlayerProfile);

export default router;