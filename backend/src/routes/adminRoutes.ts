import { Router } from 'express';
import { getUsers, createUser, updateUser, getAuditLogs, distributeProfit, getMatchRates, updateMatchRates, getProfitSummary } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Most admin routes allowed for both ADMIN and SUPER_ADMIN
router.use(authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);

router.get('/audit-logs', getAuditLogs);
router.get('/profit-summary', getProfitSummary);

// Only SUPER_ADMIN can distribute profit or record special transactions
router.post('/distribute-profit', authorize(UserRole.SUPER_ADMIN), distributeProfit);

router.get('/match-rates', getMatchRates);
router.post('/match-rates', updateMatchRates);

export default router;
