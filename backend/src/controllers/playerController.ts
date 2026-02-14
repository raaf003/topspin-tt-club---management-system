import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { DEFAULT_RATING, DEFAULT_RD, DEFAULT_VOLATILITY } from '../utils/ranking';
import { logAction, AuditAction, AuditResource } from '../utils/logger';
import { notifyDataUpdate } from '../socket';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const idParamSchema = z.object({
  id: z.string().uuid(),
});

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

export const getPlayers = async (req: Request, res: Response) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { rating: 'desc' }
    });
    res.json(players);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPlayer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, nickname, avatarUrl, phone, initialBalance } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Check if nickname already exists
    if (nickname) {
      const existing = await prisma.player.findUnique({ where: { nickname } });
      if (existing) {
        return res.status(400).json({ message: 'Nickname already exists' });
      }
    }

    const player = await prisma.player.create({
      data: {
        name,
        nickname: nickname || null,
        avatarUrl,
        phone: phone || null,
        initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
        rating: DEFAULT_RATING,
        rd: DEFAULT_RD,
        volatility: DEFAULT_VOLATILITY,
        recordedById: req.user.userId
      }
    });

    await logAction(req.user.userId, AuditAction.CREATE, AuditResource.PLAYER, player.id, { name });

    notifyDataUpdate('PLAYER');

    res.status(201).json(player);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePlayer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { name, nickname, avatarUrl, phone, initialBalance } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Check if nickname already exists (excluding self)
    if (nickname) {
      const existing = await prisma.player.findFirst({ 
        where: { 
          nickname,
          NOT: { id }
        } 
      });
      if (existing) {
        return res.status(400).json({ message: 'Nickname already exists' });
      }
    }

    const player = await prisma.player.update({
      where: { id },
      data: {
        name,
        nickname: nickname || null,
        avatarUrl,
        phone: phone || null,
        initialBalance: initialBalance !== undefined ? parseFloat(initialBalance) : undefined
      }
    });

    await logAction(req.user.userId, AuditAction.UPDATE, AuditResource.PLAYER, player.id, { name });

    notifyDataUpdate('PLAYER');

    res.json(player);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.issues });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getPlayerProfile = async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        matchesA: { take: 10, orderBy: { createdAt: 'desc' }, include: { playerB: true, winner: true } },
        matchesB: { take: 10, orderBy: { createdAt: 'desc' }, include: { playerA: true, winner: true } },
        payments: { take: 10, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!player) return res.status(404).json({ message: 'Player not found' });
    res.json(player);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.issues });
    }
    res.status(500).json({ message: error.message });
  }
};
