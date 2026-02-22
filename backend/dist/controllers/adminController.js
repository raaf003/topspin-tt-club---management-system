"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMatchRates = exports.getMatchRates = exports.distributeProfit = exports.getProfitSummary = exports.getAuditLogs = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const socket_1 = require("../socket");
const zod_1 = require("zod");
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
// --- User Management ---
const getUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: { id: true, email: true, name: true, role: true, isPartner: true, profitPercentage: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const { email, password, name, role, isPartner, profitPercentage } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const lowerEmail = email.toLowerCase();
        const user = await prisma_1.default.user.create({
            data: {
                email: lowerEmail,
                password: hashedPassword,
                name,
                role: role,
                isPartner: isPartner || false,
                profitPercentage: profitPercentage ? parseFloat(profitPercentage) : 0
            }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.CREATE, logger_1.AuditResource.USER, user.id, { email: lowerEmail, role });
        (0, socket_1.notifyDataUpdate)('USER');
        res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, isPartner: user.isPartner, profitPercentage: user.profitPercentage });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { email, name, role, isPartner, profitPercentage, password } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = {
            name,
            role: role,
            isPartner
        };
        if (email) {
            data.email = email.toLowerCase();
        }
        if (password) {
            data.password = await bcryptjs_1.default.hash(password, 10);
        }
        if (profitPercentage !== undefined) {
            data.profitPercentage = parseFloat(profitPercentage);
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.USER, id, { email: user.email, role });
        (0, socket_1.notifyDataUpdate)('USER');
        res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isPartner: user.isPartner, profitPercentage: user.profitPercentage });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateUser = updateUser;
// --- Audit Logs ---
const getAuditLogs = async (req, res) => {
    try {
        const logs = await prisma_1.default.auditLog.findMany({
            include: { user: { select: { name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 500
        });
        // Map createdAt to timestamp for frontend compatibility
        const formattedLogs = logs.map(log => ({
            ...log,
            timestamp: log.createdAt
        }));
        res.json(formattedLogs);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAuditLogs = getAuditLogs;
// --- Profit Distribution ---
const getProfitSummary = async (req, res) => {
    try {
        const matches = await prisma_1.default.match.findMany({ select: { totalValue: true } });
        const totalRevenue = matches.reduce((sum, m) => sum + (m.totalValue || 0), 0);
        const expenses = await prisma_1.default.expense.findMany({ select: { amount: true } });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const distributions = await prisma_1.default.financialTransaction.findMany({
            where: { type: client_1.TransactionType.PARTNER_PAYOUT },
            select: { amount: true }
        });
        const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        const remainingProfit = netProfit - totalDistributed;
        res.json({
            totalRevenue,
            totalExpenses,
            netProfit,
            totalDistributed,
            remainingProfit
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProfitSummary = getProfitSummary;
const distributeProfit = async (req, res) => {
    try {
        const { amount, description, usePercentages } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const partners = await prisma_1.default.user.findMany({ where: { isPartner: true } });
        if (partners.length === 0) {
            return res.status(400).json({ message: 'No partners found to distribute profit to' });
        }
        const totalToDistribute = parseFloat(amount);
        const transactions = [];
        const todayStr = new Date().toISOString().split('T')[0];
        for (const partner of partners) {
            let share = 0;
            if (usePercentages) {
                share = (totalToDistribute * (partner.profitPercentage || 0)) / 100;
            }
            else {
                share = totalToDistribute / partners.length;
            }
            if (share <= 0)
                continue;
            const tx = await prisma_1.default.financialTransaction.create({
                data: {
                    type: client_1.TransactionType.PARTNER_PAYOUT,
                    amount: share,
                    description: `Profit Distribution: ${description || ''} (Distributed to ${partner.name})`,
                    date: todayStr,
                    recordedById: req.user.userId
                }
            });
            transactions.push(tx);
        }
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.CREATE, logger_1.AuditResource.FINANCE, undefined, { amount, partnerCount: partners.length, usePercentages });
        (0, socket_1.notifyDataUpdate)('FINANCE');
        res.status(201).json({ message: 'Profit distributed successfully', transactions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.distributeProfit = distributeProfit;
// --- Match Rates (GameConfig) ---
const getMatchRates = async (req, res) => {
    try {
        const configs = await prisma_1.default.gameConfig.findMany();
        res.json(configs);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMatchRates = getMatchRates;
const updateMatchRates = async (req, res) => {
    try {
        const { rates } = req.body; // Array of { type, price }
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        for (const r of rates) {
            await prisma_1.default.gameConfig.upsert({
                where: { type: r.type },
                update: { price: parseFloat(r.price) },
                create: { type: r.type, price: parseFloat(r.price) }
            });
        }
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.CONFIG, undefined, { rates });
        (0, socket_1.notifyDataUpdate)('CONFIG');
        res.json({ message: 'Rates updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateMatchRates = updateMatchRates;
