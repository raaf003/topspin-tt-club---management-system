"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopLiveMatchController = exports.startLiveMatchController = exports.getMatches = exports.updateMatch = exports.createMatch = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const ranking_1 = require("../utils/ranking");
const logger_1 = require("../utils/logger");
const socket_1 = require("../socket");
const zod_1 = require("zod");
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const createMatch = async (req, res) => {
    try {
        const { playerAId, playerBId, winnerId, points, tableId, typeId, isRated, payerOption, totalValue, charges, date, recordedAt } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const createdAt = recordedAt ? new Date(recordedAt) : (date ? new Date(date) : new Date());
        // Determine the date string: use provided date or derive from local-ish createdAt
        const matchDate = date || createdAt.toISOString().split('T')[0];
        // 1. Create the match
        const match = await prisma_1.default.match.create({
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
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.CREATE, logger_1.AuditResource.MATCH, match.id, { playerAId, playerBId });
        // 2. Update rankings incrementally for the two involved players
        // This is much more efficient than recalculating all matches
        if (isRated !== false && winnerId) {
            const pA = await prisma_1.default.player.findUnique({ where: { id: playerAId } });
            const pB = await prisma_1.default.player.findUnique({ where: { id: playerBId } });
            if (pA && pB) {
                const stats = (0, ranking_1.updateRatingsIncremental)(pA, pB, match);
                await Promise.all(Object.keys(stats).map(id => prisma_1.default.player.update({
                    where: { id },
                    data: stats[id]
                })));
            }
        }
        const fullMatch = await prisma_1.default.match.findUnique({
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
        (0, socket_1.notifyDataUpdate)('MATCH');
        res.status(201).json({
            ...fullMatch,
            recordedBy: fullMatch?.recorder,
            recordedAt: finalCreatedAt.getTime(),
            date: dateStr
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
exports.createMatch = createMatch;
const updateMatch = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { playerAId, playerBId, winnerId, points, tableId, typeId, isRated, payerOption, totalValue, charges, date } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        await prisma_1.default.match.update({
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
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.MATCH, id, { playerAId, playerBId });
        // Recalculate rankings for all players since a match in the past might have changed
        const allPlayers = await prisma_1.default.player.findMany();
        const allMatches = await prisma_1.default.match.findMany({
            orderBy: { createdAt: 'asc' }
        });
        const formattedMatches = allMatches.map((m) => ({
            ...m,
            date: m.date || m.createdAt.toISOString().split('T')[0],
            charges: m.charges || {}
        }));
        const stats = (0, ranking_1.calculateAllPlayerStats)(allPlayers, formattedMatches);
        const updatePromises = Object.keys(stats).map(playerId => {
            const pStats = stats[playerId];
            return prisma_1.default.player.update({
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
        const updatedMatch = await prisma_1.default.match.findUnique({
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
        if (!updatedMatch)
            return res.status(404).json({ message: 'Match not found' });
        (0, socket_1.notifyDataUpdate)('MATCH');
        res.json({
            ...updatedMatch,
            recordedBy: updatedMatch.recorder,
            recordedAt: updatedMatch.createdAt.getTime(),
            date: updatedMatch.date || updatedMatch.createdAt.toISOString().split('T')[0]
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateMatch = updateMatch;
const getMatches = async (req, res) => {
    try {
        const { date, startDate, endDate, page = '1', limit = '100000' } = req.query;
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 100000;
        const skip = (p - 1) * l;
        const where = {};
        if (date) {
            where.date = date;
        }
        else if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = startDate;
            if (endDate)
                where.date.lte = endDate;
        }
        const [matches, total] = await Promise.all([
            prisma_1.default.match.findMany({
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
            prisma_1.default.match.count({ where })
        ]);
        const formatted = matches.map((m) => {
            const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
            const isPublic = !req.user;
            const baseMatch = {
                id: m.id,
                playerAId: m.playerAId,
                playerBId: m.playerBId,
                winnerId: m.winnerId,
                points: m.points,
                isRated: m.isRated,
                tableId: m.tableId,
                typeId: m.typeId,
                date: m.date || createdAt.toISOString().split('T')[0],
                createdAt: m.createdAt,
                recordedAt: createdAt.getTime(),
                playerA: {
                    id: m.playerA.id,
                    name: m.playerA.name,
                    nickname: m.playerA.nickname,
                    avatarUrl: m.playerA.avatarUrl,
                    rating: m.playerA.rating
                },
                playerB: {
                    id: m.playerB.id,
                    name: m.playerB.name,
                    nickname: m.playerB.nickname,
                    avatarUrl: m.playerB.avatarUrl,
                    rating: m.playerB.rating
                },
                winner: m.winner ? { id: m.winner.id, name: m.winner.name } : null,
                table: m.table,
                type: m.type
            };
            if (isPublic) {
                return baseMatch;
            }
            return {
                ...baseMatch,
                payerOption: m.payerOption,
                totalValue: m.totalValue,
                charges: m.charges,
                recordedBy: m.recorder,
                recorder: m.recorder
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
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getMatches = getMatches;
const startLiveMatchController = async (req, res) => {
    try {
        const { id, playerAId, playerBId, points, table, startTime } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        (0, socket_1.startLiveMatch)({
            id,
            playerAId,
            playerBId,
            points,
            table,
            startTime,
            startedBy: req.user.userId
        });
        res.status(200).json({ message: 'Live match started' });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.startLiveMatchController = startLiveMatchController;
const stopLiveMatchController = async (req, res) => {
    (0, socket_1.stopLiveMatch)();
    res.status(200).json({ message: 'Live match stopped' });
};
exports.stopLiveMatchController = stopLiveMatchController;
