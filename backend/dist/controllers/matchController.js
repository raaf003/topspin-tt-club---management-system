"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatches = exports.createMatch = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const ranking_1 = require("../utils/ranking");
const createMatch = async (req, res) => {
    try {
        const { playerAId, playerBId, winnerId, points, tableId, typeId, isRated, payerOption, totalValue, charges } = req.body;
        // 1. Create the match
        const match = await prisma_1.default.match.create({
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
                recordedById: req.user.userId
            }
        });
        // 2. Recalculate rankings
        const allPlayers = await prisma_1.default.player.findMany();
        const allMatches = await prisma_1.default.match.findMany({
            orderBy: { createdAt: 'asc' }
        });
        // Convert matches to the format ranking util expects
        const formattedMatches = allMatches.map(m => ({
            ...m,
            date: m.createdAt.toISOString().split('T')[0],
            charges: m.charges || {}
        }));
        const stats = (0, ranking_1.calculateAllPlayerStats)(allPlayers, formattedMatches);
        // 3. Update player records with new stats
        const updatePromises = Object.keys(stats).map(playerId => {
            const pStats = stats[playerId];
            return prisma_1.default.player.update({
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
        res.status(201).json({ ...match, date: match.createdAt.toISOString().split('T')[0] });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
exports.createMatch = createMatch;
const getMatches = async (req, res) => {
    try {
        const matches = await prisma_1.default.match.findMany({
            include: {
                playerA: true,
                playerB: true,
                winner: true,
                table: true,
                type: true
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        // Add the missing 'date' field expected by frontend
        const formatted = matches.map(m => ({
            ...m,
            date: m.createdAt.toISOString().split('T')[0]
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMatches = getMatches;
