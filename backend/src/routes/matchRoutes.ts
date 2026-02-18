import { Router } from 'express';
import { createMatch, updateMatch, getMatches, startLiveMatchController, stopLiveMatchController } from '../controllers/matchController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createMatch);
router.patch('/:id', authenticate, updateMatch);
router.get('/', optionalAuthenticate, getMatches);

// Live Match Routes
router.post('/live', authenticate, startLiveMatchController);
router.delete('/live', authenticate, stopLiveMatchController);

export default router;