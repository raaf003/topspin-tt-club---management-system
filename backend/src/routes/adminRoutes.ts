import { Router } from 'express';
import { getUsers, createUser, updateUser, getAuditLogs, distributeProfit, getMatchRates, updateMatchRates } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Only SUPER_ADMIN can access these
router.use(authenticate, authorize(UserRole.SUPER_ADMIN));

router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);

router.get('/audit-logs', getAuditLogs);
router.post('/distribute-profit', distributeProfit);
router.get('/match-rates', getMatchRates);
router.post('/match-rates', updateMatchRates);

export default router;
