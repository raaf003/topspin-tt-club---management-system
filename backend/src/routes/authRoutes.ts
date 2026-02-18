import { Router } from 'express';
import { register, login, getUsers, updateUserRole } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// router.post('/register', register);
router.post('/login', login);

// Admin only: Get all staff/admins
router.get('/users', authenticate, authorize(UserRole.SUPER_ADMIN), getUsers);

// Super Admin only: Change roles or distribute funds
router.patch('/users/:id/role', authenticate, authorize(UserRole.SUPER_ADMIN), updateUserRole);

export default router;