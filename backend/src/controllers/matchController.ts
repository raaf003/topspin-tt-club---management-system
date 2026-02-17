import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calculateAllPlayerStats, updateRatingsIncremental } from '../utils/ranking';
import { logAction, AuditAction, AuditResource } from '../utils/logger';
import { startLiveMatch, stopLiveMatch, notifyDataUpdate } from '../socket';
import { UserRole } from '@prisma/client';
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

export const createMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { playerAId, playerBId, winnerId, points, tableId, typeId, isRated, payerOption, totalValue, charges, date, recordedAt } = req.body;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const createdAt = recordedAt ? new Date(recordedAt) : (date ? new Date(date) : new Date());
    
    // Determine the date string: use provided date or derive from local-ish createdAt
    const matchDate = date || createdAt.toISOString().split('T')[0];

    // 1. Create the match
    const match = await prisma.match.create({
      data: {
        playerAId,
        playerBId,
        winnerId: winnerId || null,
        points: parseInt(points),
        tableId: tableId || null,
        typeId: typeId || null,
        isRated: isRated !== undefined ? isRated : true,
        payerOption,
        totalValue: parseFloat(totalValue),
        charges,
        date: matchDate,
        createdAt,
        recordedById: req.user.userId
      }
    });

    await logAction(req.user.userId, AuditAction.CREATE, AuditResource.MATCH, match.id, { playerAId, playerBId });

    // 2. Update rankings incrementally for the two involved players
    // This is much more efficient than recalculating all matches
    if (isRated !== false && winnerId) {
      const pA = await prisma.player.findUnique({ where: { id: playerAId } });
      const pB = await prisma.player.findUnique({ where: { id: playerBId } });

      if (pA && pB) {
        const stats = updateRatingsIncremental(pA, pB, match);
        
        await Promise.all(Object.keys(stats).map(id => 
          prisma.player.update({
            where: { id },
            data: stats[id]
          })
        ));
      }
    }

    const fullMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: {
        playerA: true,
        playerB: true,
        winner: true,
        table: true,
        type: true,
        recorder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const finalCreatedAt = fullMatch?.createdAt ? new Date(fullMatch.createdAt) : createdAt;
    const dateStr = fullMatch?.date || finalCreatedAt.toISOString().split('T')[0];
    
    // Notify all clients that a new match was created
    notifyDataUpdate('MATCH');

    res.status(201).json({ 
      ...fullMatch, 
      recordedBy: fullMatch?.recorder,
      recordedAt: finalCreatedAt.getTime(),
      date: dateStr
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const updateMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { playerAId, playerBId, winnerId, points, tableId, typeId, isRated, payerOption, totalValue, charges, date } = req.body;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    await prisma.match.update({
      where: { id },
      data: {
        playerAId,
        playerBId,
        winnerId: winnerId || null,
        points: points ? parseInt(points) : undefined,
        tableId: tableId || null,
        typeId: typeId || null,
        isRated,
        payerOption,
        totalValue: totalValue ? parseFloat(totalValue) : undefined,
        charges,
        date
      }
    });

    await logAction(req.user.userId, AuditAction.UPDATE, AuditResource.MATCH, id, { playerAId, playerBId });

    // Recalculate rankings for all players since a match in the past might have changed
    const allPlayers = await prisma.player.findMany();
    const allMatches = await prisma.match.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const formattedMatches = allMatches.map((m) => ({
      ...m,
      date: (m.date as string) || m.createdAt.toISOString().split('T')[0],
      charges: (m.charges as unknown as Record<string, number>) || {}
    }));

    const stats = calculateAllPlayerStats(allPlayers, formattedMatches);

    const updatePromises = Object.keys(stats).map(playerId => {
      const pStats = stats[playerId];
      return prisma.player.update({
        where: { id: playerId },
        data: {
          rating: pStats.rating,
          rd: pStats.rd,
          volatility: pStats.volatility,
          earnedTier: pStats.earnedTier,
          totalRatedMatches: pStats.totalRatedMatches,
          peakRating: pStats.peakRating
        }
      });
    });
    await Promise.all(updatePromises);

    const updatedMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        playerA: true,
        playerB: true,
        winner: true,
        table: true,
        type: true,
        recorder: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!updatedMatch) return res.status(404).json({ message: 'Match not found' });

    notifyDataUpdate('MATCH');

    res.json({
      ...updatedMatch,
      recordedBy: updatedMatch.recorder,
      recordedAt: updatedMatch.createdAt.getTime(),
      date: updatedMatch.date || updatedMatch.createdAt.toISOString().split('T')[0]
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.issues });
    }
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getMatches = async (req: Request, res: Response) => {
  try {
    const { date, startDate, endDate, page = '1', limit = '1000' } = req.query;
    
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 1000;
    const skip = (p - 1) * l;

    const where: any = {};

    if (date) {
      where.date = date as string;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate as string;
      if (endDate) where.date.lte = endDate as string;
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          playerA: true,
          playerB: true,
          winner: true,
          table: true,
          type: true,
          recorder: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l
      }),
      prisma.match.count({ where })
    ]);
    
    // Add the missing 'date' field expected by frontend
    const formatted = matches.map((m) => {
      const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
      return {
        ...m,
        recordedBy: m.recorder, // Map 'recorder' to 'recordedBy' for frontend compatibility
        recordedAt: createdAt.getTime(),
        // Priority: stored date field > derived date
        date: (m.date as string) || createdAt.toISOString().split('T')[0]
      };
    });

    res.json({
      matches: formatted,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const startLiveMatchController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, playerAId, playerBId, points, table, startTime } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    startLiveMatch({
      id,
      playerAId,
      playerBId,
      points,
      table,
      startTime,
      startedBy: req.user.userId
    });
    res.status(200).json({ message: 'Live match started' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const stopLiveMatchController = async (req: Request, res: Response) => {
  stopLiveMatch();
  res.status(200).json({ message: 'Live match stopped' });
};
