import { Router } from 'express';
import { createPayment, updatePayment, createExpense, updateExpense, getFinancialReport, recordSpecialTransaction, getPayments, getExpenses } from '../controllers/financeController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/payments', authenticate, getPayments);
router.get('/expenses', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), getExpenses);
router.post('/payment', authenticate, createPayment);
router.patch('/payment/:id', authenticate, updatePayment);
router.post('/expense', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), createExpense);
router.patch('/expense/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), updateExpense);
router.post('/special', authenticate, authorize(UserRole.SUPER_ADMIN), recordSpecialTransaction);
router.get('/report', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), getFinancialReport);

export default router;