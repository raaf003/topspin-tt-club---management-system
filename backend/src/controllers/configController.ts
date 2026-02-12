import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { logAction, AuditAction, AuditResource } from '../utils/logger';

export const getTables = async (req: Request, res: Response) => {
  try {
    const tables = await prisma.gameTable.findMany();
    res.json(tables);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTable = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const table = await prisma.gameTable.create({
      data: { name, description }
    });

    await logAction((req as any).user.userId, AuditAction.CREATE, AuditResource.CONFIG, table.id, { name });

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

export const updateGameConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const config = await prisma.gameConfig.update({
      where: { id: id as string },
      data: { price }
    });

    await logAction((req as any).user.userId, AuditAction.UPDATE, AuditResource.CONFIG, id, { price });

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
