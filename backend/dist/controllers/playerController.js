"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerProfile = exports.createPlayer = exports.getPlayers = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const ranking_1 = require("../utils/ranking");
const getPlayers = async (req, res) => {
    try {
        const players = await prisma_1.default.player.findMany({
            orderBy: { rating: 'desc' }
        });
        res.json(players);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPlayers = getPlayers;
const createPlayer = async (req, res) => {
    try {
        const { name, nickname, avatarUrl, phone } = req.body;
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
                nickname,
                avatarUrl,
                phone,
                rating: ranking_1.DEFAULT_RATING,
                rd: ranking_1.DEFAULT_RD,
                volatility: ranking_1.DEFAULT_VOLATILITY,
                recordedById: req.user.userId
            }
        });
        res.status(201).json(player);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createPlayer = createPlayer;
const getPlayerProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const player = await prisma_1.default.player.findUnique({
            where: { id: id },
            include: {
                matchesA: { take: 10, orderBy: { createdAt: 'desc' }, include: { playerB: true, winner: true } },
                matchesB: { take: 10, orderBy: { createdAt: 'desc' }, include: { playerA: true, winner: true } },
                payments: { take: 10, orderBy: { createdAt: 'desc' } }
            }
        });
        if (!player)
            return res.status(404).json({ message: 'Player not found' });
        res.json(player);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPlayerProfile = getPlayerProfile;
