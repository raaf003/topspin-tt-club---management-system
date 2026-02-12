import { Router } from 'express';
import { getTables, createTable, getGameConfigs, updateGameConfig } from '../controllers/configController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/tables', authenticate, getTables);
router.post('/tables', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), createTable);

router.get('/game-types', authenticate, getGameConfigs);
router.patch('/game-types/:id', authenticate, authorize(UserRole.SUPER_ADMIN), updateGameConfig);

export default router;