import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { logAction, AuditAction, AuditResource } from '../utils/logger';
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

export const getTables = async (req: Request, res: Response) => {
  try {
    const tables = await prisma.gameTable.findMany();
    res.json(tables);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const table = await prisma.gameTable.create({
      data: { name, description }
    });

    await logAction(req.user.userId, AuditAction.CREATE, AuditResource.CONFIG, table.id, { name });

    res.status(201).json(table);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGameConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.gameConfig.findMany();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGameConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { price } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const config = await prisma.gameConfig.update({
      where: { id },
      data: { price }
    });

    await logAction(req.user.userId, AuditAction.UPDATE, AuditResource.CONFIG, id, { price });

    res.json(config);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};
