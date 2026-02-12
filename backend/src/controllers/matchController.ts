import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calculateAllPlayerStats } from '../utils/ranking';

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { playerAId, playerBId, winnerId, points, tableId, typeId, isRated, payerOption, totalValue, charges, date, recordedAt } = req.body;

    const createdAt = recordedAt ? new Date(recordedAt) : (date ? new Date(date) : new Date());

    // 1. Create the match
    const match = await prisma.match.create({
      data: {
        playerAId,
        playerBId,
        winnerId,
        points: parseInt(points),
        tableId,
        typeId,
        isRated: isRated !== undefined ? isRated : true,
        payerOption,
        totalValue: parseFloat(totalValue),
        charges,
        createdAt,
        recordedById: (req as any).user.userId
      }
    });

    // 2. Recalculate rankings
    const allPlayers = await prisma.player.findMany();
    const allMatches = await prisma.match.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // Convert matches to the format ranking util expects
    const formattedMatches = allMatches.map((m: any) => {
      const dateStr = m.createdAt.toISOString().split('T')[0];
      return {
        ...m,
        date: dateStr,
        charges: (m.charges as any) || {}
      };
    });

    const stats = calculateAllPlayerStats(allPlayers, formattedMatches);

    // 3. Update player records with new stats
    const updatePromises = Object.keys(stats).map(playerId => {
      const pStats = stats[playerId];
      return prisma.player.update({
        where: { id: playerId },
        data: {
          rating: pStats.rating,
          rd: pStats.rd,
          volatility: pStats.vol,
          earnedTier: pStats.earnedTier,
          totalRatedMatches: pStats.totalRatedMatches,
          peakRating: pStats.peakRating
        }
      });
    });

    const fullMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: {
        playerA: true,
        playerB: true,
        winner: true,
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
    const dateStr = finalCreatedAt.toISOString().split('T')[0];
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

export const updateMatch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerAId, playerBId, winnerId, points, tableId, typeId, isRated, payerOption, totalValue, charges } = req.body;

    await prisma.match.update({
      where: { id },
      data: {
        playerAId,
        playerBId,
        winnerId,
        points: points ? parseInt(points) : undefined,
        tableId,
        typeId,
        isRated,
        payerOption,
        totalValue: totalValue ? parseFloat(totalValue) : undefined,
        charges
      }
    });

    // Recalculate rankings for all players since a match in the past might have changed
    const allPlayers = await prisma.player.findMany();
    const allMatches = await prisma.match.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const formattedMatches = allMatches.map((m: any) => ({
      ...m,
      date: m.createdAt.toISOString().split('T')[0],
      charges: (m.charges as any) || {}
    }));

    const stats = calculateAllPlayerStats(allPlayers, formattedMatches);

    const updatePromises = Object.keys(stats).map(playerId => {
      const pStats = stats[playerId];
      return prisma.player.update({
        where: { id: playerId },
        data: {
          rating: pStats.rating,
          rd: pStats.rd,
          volatility: pStats.vol,
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
        recorder: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!updatedMatch) return res.status(404).json({ message: 'Match not found' });

    res.json({
      ...updatedMatch,
      recordedBy: updatedMatch.recorder,
      recordedAt: updatedMatch.createdAt.getTime(),
      date: updatedMatch.createdAt.toISOString().split('T')[0]
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMatches = async (req: Request, res: Response) => {
  try {
    const matches = await prisma.match.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    
    // Add the missing 'date' field expected by frontend
    const formatted = matches.map((m: any) => {
      const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
      return {
        ...m,
        recordedBy: m.recorder, // Map 'recorder' to 'recordedBy' for frontend compatibility
        recordedAt: createdAt.getTime(),
        date: createdAt.toISOString().split('T')[0]
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
