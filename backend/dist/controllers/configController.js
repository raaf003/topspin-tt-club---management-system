"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGameConfig = exports.getGameConfigs = exports.createTable = exports.getTables = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const getTables = async (req, res) => {
    try {
        const tables = await prisma_1.default.gameTable.findMany();
        res.json(tables);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTables = getTables;
const createTable = async (req, res) => {
    try {
        const { name, description } = req.body;
        const table = await prisma_1.default.gameTable.create({
            data: { name, description }
        });
        res.status(201).json(table);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createTable = createTable;
const getGameConfigs = async (req, res) => {
    try {
        const configs = await prisma_1.default.gameConfig.findMany();
        res.json(configs);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getGameConfigs = getGameConfigs;
const updateGameConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;
        const config = await prisma_1.default.gameConfig.update({
            where: { id: id },
            data: { price }
        });
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateGameConfig = updateGameConfig;
