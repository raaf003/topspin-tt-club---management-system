"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTable = exports.updateGameConfig = exports.getGameConfigs = exports.updateTable = exports.createTable = exports.getTables = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
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
        const { name, description, isActive } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const table = await prisma_1.default.gameTable.create({
            data: {
                name,
                description,
                isActive: isActive !== undefined ? isActive : true
            }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.CREATE, logger_1.AuditResource.CONFIG, table.id, { name });
        res.status(201).json(table);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createTable = createTable;
const updateTable = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { name, description, isActive } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const table = await prisma_1.default.gameTable.update({
            where: { id },
            data: { name, description, isActive }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.CONFIG, id, { name, isActive });
        res.json(table);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateTable = updateTable;
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
        const { id } = idParamSchema.parse(req.params);
        const { price } = req.body;
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const config = await prisma_1.default.gameConfig.update({
            where: { id },
            data: { price }
        });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.UPDATE, logger_1.AuditResource.CONFIG, id, { price });
        res.json(config);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateGameConfig = updateGameConfig;
const deleteTable = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        // Check if table has matches
        const matchCount = await prisma_1.default.match.count({ where: { tableId: id } });
        if (matchCount > 0) {
            return res.status(400).json({ message: 'Cannot delete table with existing matches' });
        }
        await prisma_1.default.gameTable.delete({ where: { id } });
        await (0, logger_1.logAction)(req.user.userId, logger_1.AuditAction.DELETE, logger_1.AuditResource.CONFIG, id, { resource: 'Table' });
        res.json({ message: 'Table deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteTable = deleteTable;
