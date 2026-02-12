"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Admin only: Get all staff/admins
router.get('/users', auth_1.authenticate, (0, auth_1.authorize)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN), authController_1.getUsers);
// Super Admin only: Change roles or distribute funds
router.patch('/users/:id/role', auth_1.authenticate, (0, auth_1.authorize)(client_1.UserRole.SUPER_ADMIN), authController_1.updateUserRole);
exports.default = router;
