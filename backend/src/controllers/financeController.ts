import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { UserRole, TransactionType } from '@prisma/client';
import { logAction, AuditAction, AuditResource } from '../utils/logger';
import { notifyDataUpdate } from '../socket';

export const createPayment = async (req: Request, res: Response) => {
  try {
    const { playerId, totalAmount, allocations, mode, notes, date, recordedAt } = req.body;
    const amount = parseFloat(totalAmount);
    
    // Use recordedAt (timestamp) if available to preserve time, 
    // otherwise fallback to date string or current time
    const createdAt = recordedAt ? new Date(recordedAt) : (date ? new Date(date) : new Date());
    const paymentDate = date || createdAt.toISOString().split('T')[0];

    const payment = await prisma.payment.create({
      data: {
        playerId,
        amount,
        allocations: allocations || [],
        mode,
        description: notes,
        date: paymentDate,
        createdAt,
        recordedById: (req as any).user.userId
      }
    });

    await prisma.financialTransaction.create({
      data: {
        type: TransactionType.MATCH_PAYMENT,
        amount,
        description: `Payment from player ${playerId}: ${notes || ''}`,
        date: paymentDate,
        recordedById: (req as any).user.userId
      }
    });

    await logAction((req as any).user.userId, AuditAction.CREATE, AuditResource.PAYMENT, payment.id, { playerId, amount });

    notifyDataUpdate('FINANCE');

    res.status(201).json({
      ...payment,
      totalAmount: payment.amount,
      primaryPayerId: payment.playerId,
      allocations: (payment.allocations as any) || [],
      date: payment.date || payment.createdAt.toISOString().split('T')[0],
      recordedAt: payment.createdAt.getTime(),
      recordedBy: (req as any).user
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerId, totalAmount, allocations, mode, notes, date } = req.body;
    const amount = parseFloat(totalAmount);

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        playerId,
        amount,
        allocations: allocations || [],
        mode,
        description: notes,
        date
      },
      include: { player: true, recorder: true }
    });

    await logAction((req as any).user.userId, AuditAction.UPDATE, AuditResource.PAYMENT, id, { playerId, amount });

    notifyDataUpdate('FINANCE');

    res.json({
      ...updated,
      totalAmount: updated.amount,
      primaryPayerId: updated.playerId,
      allocations: (updated.allocations as any) || [],
      date: updated.date || updated.createdAt.toISOString().split('T')[0],
      recordedAt: updated.createdAt.getTime(),
      recordedBy: updated.recorder
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { amount, category, notes, mode, date, recordedAt } = req.body;
    
    const createdAt = recordedAt ? new Date(recordedAt) : (date ? new Date(date) : new Date());
    const expenseDate = date || createdAt.toISOString().split('T')[0];

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description: notes,
        mode: mode || 'CASH',
        date: expenseDate,
        createdAt,
        recordedById: (req as any).user.userId
      }
    });

    await prisma.financialTransaction.create({
      data: {
        type: TransactionType.EXPENSE,
        amount: parseFloat(amount),
        description: `Expense (${category}): ${notes || ''}`,
        date: expenseDate,
        recordedById: (req as any).user.userId
      }
    });

    await logAction((req as any).user.userId, AuditAction.CREATE, AuditResource.EXPENSE, expense.id, { amount: expense.amount, category });

    notifyDataUpdate('FINANCE');

    res.status(201).json({
      ...expense,
      date: expense.date || expense.createdAt.toISOString().split('T')[0],
      recordedAt: expense.createdAt.getTime(),
      recordedBy: (req as any).user
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, category, notes, mode, date } = req.body;
    
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        category,
        description: notes,
        mode,
        date
      },
      include: { recorder: true }
    });

    await logAction((req as any).user.userId, AuditAction.UPDATE, AuditResource.EXPENSE, id, { amount: updated.amount, category });

    notifyDataUpdate('FINANCE');

    res.json({
      ...updated,
      date: updated.date || updated.createdAt.toISOString().split('T')[0],
      recordedAt: updated.createdAt.getTime(),
      recordedBy: updated.recorder
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const recordSpecialTransaction = async (req: Request, res: Response) => {
  try {
    const { type, amount, description } = req.body;
    // type should be SALARY or CAPITAL_DISTRIBUTION
    const transaction = await prisma.financialTransaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        recordedById: (req as any).user.userId
      }
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { player: true, recorder: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    
    const formatted = payments.map((p: any) => ({
      ...p,
      totalAmount: p.amount,
      primaryPayerId: p.playerId,
      allocations: (p.allocations as any) || [],
      date: p.date || p.createdAt.toISOString().split('T')[0],
      recordedAt: p.createdAt.getTime(),
      recordedBy: p.recorder
    }));
    
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { recorder: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    
    const formatted = expenses.map((e: any) => ({
      ...e,
      date: e.date || e.createdAt.toISOString().split('T')[0],
      recordedAt: e.createdAt.getTime(),
      recordedBy: e.recorder
    }));
    
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFinancialReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const transactions = await prisma.financialTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const summary = transactions.reduce((acc: any, curr: any) => {
      if (curr.type === TransactionType.MATCH_PAYMENT || curr.type === TransactionType.OTHER_INCOME) {
        acc.revenue += curr.amount;
      } else {
        acc.expenses += curr.amount;
      }
      return acc;
    }, { revenue: 0, expenses: 0, profit: 0 });

    summary.profit = summary.revenue - summary.expenses;

    res.json({ summary, transactions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
