import { Router } from 'express';
import { getTables, createTable, updateTable, deleteTable, getGameConfigs, updateGameConfig } from '../controllers/configController';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/tables', optionalAuthenticate, getTables);
router.post('/tables', authenticate, authorize(UserRole.SUPER_ADMIN), createTable);
router.put('/tables/:id', authenticate, authorize(UserRole.SUPER_ADMIN), updateTable);
router.delete('/tables/:id', authenticate, authorize(UserRole.SUPER_ADMIN), deleteTable);

router.get('/game-types', optionalAuthenticate, getGameConfigs);
router.patch('/game-types/:id', authenticate, authorize(UserRole.SUPER_ADMIN), updateGameConfig);

export default router;