import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole, TransactionType } from '@prisma/client';
import { logAction, AuditAction, AuditResource } from '../utils/logger';

// --- User Management ---
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isPartner: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, isPartner } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const lowerEmail = email.toLowerCase();
    
    const user = await prisma.user.create({
      data: {
        email: lowerEmail,
        password: hashedPassword,
        name,
        role: role as UserRole,
        isPartner: isPartner || false
      }
    });

    await logAction((req as any).user.userId, AuditAction.CREATE, AuditResource.USER, user.id, { email: lowerEmail, role });

    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, isPartner: user.isPartner });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role, isPartner, password } = req.body;
    
    const data: any = { name, role, isPartner };
    if (email) {
      data.email = email.toLowerCase();
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data
    });

    await logAction((req as any).user.userId, AuditAction.UPDATE, AuditResource.USER, id, { email: data.email, role });

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isPartner: user.isPartner });
  } catch (error: any) {
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
export const distributeProfit = async (req: Request, res: Response) => {
  try {
    const { amount, description } = req.body;
    const partners = await prisma.user.findMany({ where: { isPartner: true } });
    
    if (partners.length === 0) {
      return res.status(400).json({ message: 'No partners found to distribute profit to' });
    }

    const share = parseFloat(amount) / partners.length;
    const transactions = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const partner of partners) {
      const tx = await prisma.financialTransaction.create({
        data: {
          type: TransactionType.PARTNER_PAYOUT,
          amount: share,
          description: `Profit Distribution: ${description || ''} (Distributed to ${partner.name})`,
          date: todayStr,
          recordedById: (req as any).user.userId
        }
      });
      transactions.push(tx);
    }

    await logAction((req as any).user.userId, AuditAction.CREATE, AuditResource.FINANCE, undefined, { amount, partnerCount: partners.length });

    res.status(201).json({ message: 'Profit distributed successfully', sharePerPartner: share, transactions });
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

export const updateMatchRates = async (req: Request, res: Response) => {
  try {
    const { rates } = req.body; // Array of { type, price }
    
    for (const r of rates) {
      await prisma.gameConfig.upsert({
        where: { type: r.type },
        update: { price: parseFloat(r.price) },
        create: { type: r.type, price: parseFloat(r.price) }
      });
    }

    await logAction((req as any).user.userId, AuditAction.UPDATE, AuditResource.CONFIG, undefined, { rates });

    res.json({ message: 'Rates updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
