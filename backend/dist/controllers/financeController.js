"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinancialReport = exports.getExpenses = exports.getPayments = exports.recordSpecialTransaction = exports.createExpense = exports.createPayment = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("@prisma/client");
const createPayment = async (req, res) => {
    try {
        const { playerId, totalAmount, allocations, mode, notes, date } = req.body;
        const amount = parseFloat(totalAmount);
        const payment = await prisma_1.default.payment.create({
            data: {
                playerId,
                amount,
                allocations: allocations || [],
                mode,
                description: notes,
                createdAt: date ? new Date(date) : new Date(),
                recordedById: req.user.userId
            }
        });
        await prisma_1.default.financialTransaction.create({
            data: {
                type: client_1.TransactionType.MATCH_PAYMENT,
                amount,
                description: `Payment from player ${playerId}: ${notes || ''}`,
                recordedById: req.user.userId
            }
        });
        res.status(201).json({
            ...payment,
            totalAmount: payment.amount,
            primaryPayerId: payment.playerId,
            date: payment.createdAt.toISOString().split('T')[0]
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createPayment = createPayment;
const createExpense = async (req, res) => {
    try {
        const { amount, category, notes, mode, date } = req.body;
        const expense = await prisma_1.default.expense.create({
            data: {
                amount: parseFloat(amount),
                category,
                description: notes,
                mode: mode || 'CASH',
                createdAt: date ? new Date(date) : new Date(),
                recordedById: req.user.userId
            }
        });
        await prisma_1.default.financialTransaction.create({
            data: {
                type: client_1.TransactionType.EXPENSE,
                amount: parseFloat(amount),
                description: `Expense (${category}): ${notes || ''}`,
                recordedById: req.user.userId
            }
        });
        res.status(201).json({
            ...expense,
            date: expense.createdAt.toISOString().split('T')[0]
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createExpense = createExpense;
const recordSpecialTransaction = async (req, res) => {
    try {
        const { type, amount, description } = req.body;
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
        const payments = await prisma_1.default.payment.findMany({
            include: { player: true, recorder: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        const formatted = payments.map((p) => ({
            ...p,
            totalAmount: p.amount,
            primaryPayerId: p.playerId,
            allocations: p.allocations || [],
            date: p.createdAt.toISOString().split('T')[0]
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPayments = getPayments;
const getExpenses = async (req, res) => {
    try {
        const expenses = await prisma_1.default.expense.findMany({
            include: { recorder: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        const formatted = expenses.map((e) => ({
            ...e,
            date: e.createdAt.toISOString().split('T')[0]
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getExpenses = getExpenses;
const getFinancialReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
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
            if (curr.type === client_1.TransactionType.MATCH_PAYMENT || curr.type === client_1.TransactionType.OTHER_INCOME) {
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
