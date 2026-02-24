import { Router } from 'express';
import { createMatch, updateMatch, deleteMatch, getMatches, startLiveMatchController, stopLiveMatchController } from '../controllers/matchController';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Live Match Routes
router.post('/live', authenticate, startLiveMatchController);
router.delete('/live', authenticate, stopLiveMatchController);

router.post('/', authenticate, createMatch);
router.patch('/:id', authenticate, updateMatch);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), deleteMatch);
router.get('/', optionalAuthenticate, getMatches);

export default router;