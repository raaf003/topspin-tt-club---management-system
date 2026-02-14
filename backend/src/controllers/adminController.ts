import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole, TransactionType, Prisma } from '@prisma/client';
import { logAction, AuditAction, AuditResource } from '../utils/logger';
import { notifyDataUpdate } from '../socket';
import { z } from 'zod';

const idParamSchema = z.object({
  id: z.string().uuid(),
});

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

// --- User Management ---
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isPartner: true, profitPercentage: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error: unknown) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name, role, isPartner, profitPercentage } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const lowerEmail = email.toLowerCase();
    
    const user = await prisma.user.create({
      data: {
        email: lowerEmail,
        password: hashedPassword,
        name,
        role: role as UserRole,
        isPartner: isPartner || false,
        profitPercentage: profitPercentage ? parseFloat(profitPercentage) : 0
      }
    });

    await logAction(req.user.userId, AuditAction.CREATE, AuditResource.USER, user.id, { email: lowerEmail, role });

    notifyDataUpdate('USER');

    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, isPartner: user.isPartner, profitPercentage: user.profitPercentage });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { email, name, role, isPartner, profitPercentage, password } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const data: Prisma.UserUpdateInput = { 
      name, 
      role: role as UserRole, 
      isPartner 
    };
    
    if (email) {
      data.email = email.toLowerCase();
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (profitPercentage !== undefined) {
      data.profitPercentage = parseFloat(profitPercentage);
    }

    const user = await prisma.user.update({
      where: { id },
      data
    });

    await logAction(req.user.userId, AuditAction.UPDATE, AuditResource.USER, id, { email: user.email, role });

    notifyDataUpdate('USER');

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isPartner: user.isPartner, profitPercentage: user.profitPercentage });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.issues });
    }
    res.status(500).json({ message: error.message });
  }
};

// --- Audit Logs ---
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- Profit Distribution ---
export const getProfitSummary = async (req: Request, res: Response) => {
  try {
    const matches = await prisma.match.findMany({ select: { totalValue: true } });
    const totalRevenue = matches.reduce((sum, m) => sum + (m.totalValue || 0), 0);

    const expenses = await prisma.expense.findMany({ select: { amount: true } });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const distributions = await prisma.financialTransaction.findMany({
      where: { type: TransactionType.PARTNER_PAYOUT },
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const distributeProfit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, description, usePercentages } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const partners = await prisma.user.findMany({ where: { isPartner: true } });
    
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
      } else {
        share = totalToDistribute / partners.length;
      }

      if (share <= 0) continue;

      const tx = await prisma.financialTransaction.create({
        data: {
          type: TransactionType.PARTNER_PAYOUT,
          amount: share,
          description: `Profit Distribution: ${description || ''} (Distributed to ${partner.name})`,
          date: todayStr,
          recordedById: req.user.userId
        }
      });
      transactions.push(tx);
    }

    await logAction(req.user.userId, AuditAction.CREATE, AuditResource.FINANCE, undefined, { amount, partnerCount: partners.length, usePercentages });

    notifyDataUpdate('FINANCE');

    res.status(201).json({ message: 'Profit distributed successfully', transactions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- Match Rates (GameConfig) ---
export const getMatchRates = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.gameConfig.findMany();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMatchRates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rates } = req.body; // Array of { type, price }
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    for (const r of rates) {
      await prisma.gameConfig.upsert({
        where: { type: r.type },
        update: { price: parseFloat(r.price) },
        create: { type: r.type, price: parseFloat(r.price) }
      });
    }

    await logAction(req.user.userId, AuditAction.UPDATE, AuditResource.CONFIG, undefined, { rates });

    notifyDataUpdate('CONFIG');

    res.json({ message: 'Rates updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
