"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Administrative routes are restricted to SUPER_ADMIN only
router.use(auth_1.authenticate, (0, auth_1.authorize)(client_1.UserRole.SUPER_ADMIN));
router.get('/users', adminController_1.getUsers);
router.post('/users', adminController_1.createUser);
router.patch('/users/:id', adminController_1.updateUser);
router.get('/audit-logs', adminController_1.getAuditLogs);
router.get('/profit-summary', adminController_1.getProfitSummary);
router.post('/distribute-profit', adminController_1.distributeProfit);
router.get('/match-rates', adminController_1.getMatchRates);
router.post('/match-rates', adminController_1.updateMatchRates);
exports.default = router;
