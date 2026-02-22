"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = exports.getUsers = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in environment variables');
}
const register = async (req, res) => {
    try {
        const { email, phone, password, name, role } = req.body;
        // Only allow SUPER_ADMIN to register certain roles if needed, 
        // or keep it open for the first user
        const userCount = await prisma_1.default.user.count();
        const finalRole = userCount === 0 ? client_1.UserRole.SUPER_ADMIN : (role || client_1.UserRole.STAFF);
        const hashedEmail = email.toLowerCase();
        const existing = await prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { email: hashedEmail },
                    { phone: phone }
                ]
            }
        });
        if (existing)
            return res.status(400).json({ message: 'User with this email or phone already exists' });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                email: hashedEmail,
                phone,
                password: hashedPassword,
                name,
                role: finalRole
            }
        });
        res.status(201).json({ id: user.id, email: user.email, phone: user.phone, name: user.name, role: user.role });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await prisma_1.default.user.findUnique({ where: { phone } });
        if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: { id: user.id, email: user.email, phone: user.phone, name: user.name, role: user.role }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.login = login;
const getUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: { id: true, email: true, phone: true, name: true, role: true, createdAt: true }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUsers = getUsers;
const updateUserRole = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { role } = req.body;
        if (!Object.values(client_1.UserRole).includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data: { role }
        });
        res.json({ id: user.id, role: user.role });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.issues });
        }
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateUserRole = updateUserRole;
