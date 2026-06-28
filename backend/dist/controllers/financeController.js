"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinancialReport = exports.getExpenses = exports.getPayments = exports.recordSpecialTransaction = exports.updateExpense = exports.createExpense = exports.updatePayment = exports.createPayment = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const socket_1 = require("../socket");
const zod_1 = require("zod");
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const createPayment = async (req, res) => {
    try {
        const { playerId, totalAmount, allocations, mode, description, date, recordedAt } = req.body;
        const amount = parseFloat(totalAmount);
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        // Use recordedAt (timestamp) if available to preserve time, 
        // otherwise fallback to date string or current time
        const createdAt = recordedAt ? new Date(recordedAt) : (date ? new Date(date) : new Date());
        const paymentDate = date || createdAt.toISOString().split('T')[0];
        const payment = await prisma_1.default.payment.create({
            data: {
                playerId,
                amount,
                allocations: allocations || [],
                mode,
                description,
                date: paymentDate,
                createdAt,
                recordedById: req.user.userId
            }
        });
        await prisma_1.default.financialTransaction.create({
            data: {
                type: client_1.TransactionType.MATCH_PAYMENT,
                amount,
                description: `Payment from player ${playerId}: ${description || ''}`,
                date: paymentDate,
                recordedById: req.user.userId
            }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.CREATE, logger_1.AuditResource.PAYMENT, payment.id, { playerId, amount });
        (0, socket_1.notifyDataUpdate)('FINANCE');
        res.status(201).json({
            ...payment,
            totalAmount: payment.amount,
            primaryPayerId: payment.playerId,
            allocations: payment.allocations || [],
            date: payment.date || payment.createdAt.toISOString().split('T')[0],
            recordedAt: payment.createdAt.getTime(),
            recordedBy: req.user
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createPayment = createPayment;
const updatePayment = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { playerId, totalAmount, allocations, mode, description, date } = req.body;
        const amount = parseFloat(totalAmount);
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const updated = await prisma_1.default.payment.update({
            where: { id },
            data: {
                playerId,
                amount,
                allocations: allocations || [],
                mode,
                description,
                date
            },
            include: { player: true, recorder: true }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.PAYMENT, id, { playerId, amount });
        (0, socket_1.notifyDataUpdate)('FINANCE');
        res.json({
            ...updated,
            totalAmount: updated.amount,
            primaryPayerId: updated.playerId,
            allocations: updated.allocations || [],
            date: updated.date || updated.createdAt.toISOString().split('T')[0],
            recordedAt: updated.createdAt.getTime(),
            recordedBy: updated.recorder
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error.message });
    }
};
exports.updatePayment = updatePayment;
const createExpense = async (req, res) => {
    try {
        const { amount, category, description, mode, date, recordedAt } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const createdAt = recordedAt ? new Date(recordedAt) : (date ? new Date(date) : new Date());
        const expenseDate = date || createdAt.toISOString().split('T')[0];
        const expense = await prisma_1.default.expense.create({
            data: {
                amount: parseFloat(amount),
                category,
                description,
                mode: mode || 'CASH',
                date: expenseDate,
                createdAt,
                recordedById: req.user.userId
            }
        });
        await prisma_1.default.financialTransaction.create({
            data: {
                type: client_1.TransactionType.EXPENSE,
                amount: parseFloat(amount),
                description: `Expense (${category}): ${description || ''}`,
                date: expenseDate,
                recordedById: req.user.userId
            }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.CREATE, logger_1.AuditResource.EXPENSE, expense.id, { amount: expense.amount, category });
        (0, socket_1.notifyDataUpdate)('FINANCE');
        res.status(201).json({
            ...expense,
            date: expense.date || expense.createdAt.toISOString().split('T')[0],
            recordedAt: expense.createdAt.getTime(),
            recordedBy: req.user
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createExpense = createExpense;
const updateExpense = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { amount, category, description, mode, date } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const updated = await prisma_1.default.expense.update({
            where: { id },
            data: {
                amount: parseFloat(amount),
                category,
                description,
                mode,
                date
            },
            include: { recorder: true }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.EXPENSE, id, { amount: updated.amount, category });
        (0, socket_1.notifyDataUpdate)('FINANCE');
        res.json({
            ...updated,
            date: updated.date || updated.createdAt.toISOString().split('T')[0],
            recordedAt: updated.createdAt.getTime(),
            recordedBy: updated.recorder
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error.message });
    }
};
exports.updateExpense = updateExpense;
const recordSpecialTransaction = async (req, res) => {
    try {
        const { type, amount, description } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        // type should be SALARY or CAPITAL_DISTRIBUTION
        const transaction = await prisma_1.default.financialTransaction.create({
            data: {
                type,
                amount: parseFloat(amount),
                description,
                recordedById: req.user.userId
            }
        });
        res.status(201).json(transaction);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.recordSpecialTransaction = recordSpecialTransaction;
const getPayments = async (req, res) => {
    try {
        const { startDate, endDate, limit = '100000' } = req.query;
        const l = parseInt(limit) || 100000;
        const where = {};
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = startDate;
            if (endDate)
                where.date.lte = endDate;
        }
        const payments = await prisma_1.default.payment.findMany({
            where,
            include: { player: true, recorder: true },
            orderBy: { createdAt: 'desc' },
            take: l
        });
        const formatted = payments.map((p) => ({
            ...p,
            totalAmount: p.amount,
            primaryPayerId: p.playerId,
            allocations: p.allocations || [],
            date: p.date || p.createdAt.toISOString().split('T')[0],
            recordedAt: p.createdAt.getTime(),
            recordedBy: p.recorder
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPayments = getPayments;
const getExpenses = async (req, res) => {
    try {
        const { startDate, endDate, limit = '100000' } = req.query;
        const l = parseInt(limit) || 100000;
        const where = {};
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = startDate;
            if (endDate)
                where.date.lte = endDate;
        }
        const expenses = await prisma_1.default.expense.findMany({
            where,
            include: { recorder: true },
            orderBy: { createdAt: 'desc' },
            take: l
        });
        const formatted = expenses.map((e) => ({
            ...e,
            date: e.date || e.createdAt.toISOString().split('T')[0],
            recordedAt: e.createdAt.getTime(),
            recordedBy: e.recorder
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getExpenses = getExpenses;
const getFinancialReport = async (req, res) => {
    try {
        const querySchema = zod_1.z.object({
            startDate: zod_1.z.string().optional(),
            endDate: zod_1.z.string().optional(),
        });
        const { startDate, endDate } = querySchema.parse(req.query);
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const transactions = await prisma_1.default.financialTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        const summary = transactions.reduce((acc, curr) => {
            if (curr.type === client_1.TransactionType.MATCH_PAYMENT) {
                acc.revenue += curr.amount;
            }
            else {
                acc.expenses += curr.amount;
            }
            return acc;
        }, { revenue: 0, expenses: 0, profit: 0 });
        summary.profit = summary.revenue - summary.expenses;
        res.json({ summary, transactions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getFinancialReport = getFinancialReport;
