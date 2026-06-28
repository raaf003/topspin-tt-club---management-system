"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerProfile = exports.updatePlayer = exports.createPlayer = exports.getPlayers = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const ranking_1 = require("../utils/ranking");
const logger_1 = require("../utils/logger");
const socket_1 = require("../socket");
const zod_1 = require("zod");
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const getPlayers = async (req, res) => {
    try {
        const players = await prisma_1.default.player.findMany({
            orderBy: { rating: 'desc' }
        });
        const isPublic = !req.user;
        if (isPublic) {
            return res.json(players.map(p => ({
                id: p.id,
                name: p.name,
                nickname: p.nickname,
                avatarUrl: p.avatarUrl,
                rating: p.rating,
                rd: p.rd,
                volatility: p.volatility,
                totalRatedMatches: p.totalRatedMatches,
                earnedTier: p.earnedTier,
                peakRating: p.peakRating,
                createdAt: p.createdAt
            })));
        }
        // Calculate financial stats for authenticated users
        const stats = await prisma_1.default.$queryRaw `
      SELECT 
        p.id,
        COALESCE((SELECT SUM(CAST(m.charges->>p.id AS numeric)) FROM "Match" m WHERE m.charges ? p.id), 0) as "totalSpent",
        COALESCE((SELECT SUM(CAST(elem->>'amount' AS numeric)) FROM "Payment" pay, jsonb_array_elements(pay.allocations) elem WHERE elem->>'playerId' = p.id), 0) as "totalPaid",
        COALESCE((SELECT SUM(CAST(elem->>'discount' AS numeric)) FROM "Payment" pay, jsonb_array_elements(pay.allocations) elem WHERE elem->>'playerId' = p.id), 0) as "totalDiscounted"
      FROM "Player" p;
    `;
        const statsMap = stats.reduce((acc, curr) => {
            acc[curr.id] = {
                totalSpent: Number(curr.totalSpent),
                totalPaid: Number(curr.totalPaid),
                totalDiscounted: Number(curr.totalDiscounted)
            };
            return acc;
        }, {});
        const playersWithStats = players.map(p => {
            const pStats = statsMap[p.id] || { totalSpent: 0, totalPaid: 0, totalDiscounted: 0 };
            return {
                ...p,
                totalSpent: pStats.totalSpent,
                totalPaid: pStats.totalPaid,
                totalDiscounted: pStats.totalDiscounted
            };
        });
        res.json(playersWithStats);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPlayers = getPlayers;
const createPlayer = async (req, res) => {
    try {
        const { name, nickname, avatarUrl, phone, initialBalance } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        // Check if nickname already exists
        if (nickname) {
            const existing = await prisma_1.default.player.findUnique({ where: { nickname } });
            if (existing) {
                return res.status(400).json({ message: 'Nickname already exists' });
            }
        }
        const player = await prisma_1.default.player.create({
            data: {
                name,
                nickname: nickname || null,
                avatarUrl,
                phone: phone || null,
                initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
                rating: ranking_1.DEFAULT_RATING,
                rd: ranking_1.DEFAULT_RD,
                volatility: ranking_1.DEFAULT_VOLATILITY,
                recordedById: req.user.userId
            }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.CREATE, logger_1.AuditResource.PLAYER, player.id, { name });
        (0, socket_1.notifyDataUpdate)('PLAYER');
        res.status(201).json(player);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createPlayer = createPlayer;
const updatePlayer = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { name, nickname, avatarUrl, phone, initialBalance } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        // Check if nickname already exists (excluding self)
        if (nickname) {
            const existing = await prisma_1.default.player.findFirst({
                where: {
                    nickname,
                    NOT: { id }
                }
            });
            if (existing) {
                return res.status(400).json({ message: 'Nickname already exists' });
            }
        }
        const player = await prisma_1.default.player.update({
            where: { id },
            data: {
                name,
                nickname: nickname || null,
                avatarUrl,
                phone: phone || null,
                initialBalance: initialBalance !== undefined ? parseFloat(initialBalance) : undefined
            }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.PLAYER, player.id, { name });
        (0, socket_1.notifyDataUpdate)('PLAYER');
        res.json(player);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error.message });
    }
};
exports.updatePlayer = updatePlayer;
const getPlayerProfile = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const player = await prisma_1.default.player.findUnique({
            where: { id },
            include: {
                matchesA: { take: 10, orderBy: { createdAt: 'desc' }, include: { playerB: true, winner: true } },
                matchesB: { take: 10, orderBy: { createdAt: 'desc' }, include: { playerA: true, winner: true } },
                payments: { take: 10, orderBy: { createdAt: 'desc' } }
            }
        });
        if (!player)
            return res.status(404).json({ message: 'Player not found' });
        const isPublic = !req.user;
        if (isPublic) {
            const sanitizedPlayer = {
                id: player.id,
                name: player.name,
                nickname: player.nickname,
                avatarUrl: player.avatarUrl,
                rating: player.rating,
                rd: player.rd,
                volatility: player.volatility,
                totalRatedMatches: player.totalRatedMatches,
                earnedTier: player.earnedTier,
                peakRating: player.peakRating,
                createdAt: player.createdAt
            };
            return res.json(sanitizedPlayer);
        }
        res.json(player);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error.message });
    }
};
exports.getPlayerProfile = getPlayerProfile;
