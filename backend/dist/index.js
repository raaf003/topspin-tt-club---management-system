"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_1 = require("./socket");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const playerRoutes_1 = __importDefault(require("./routes/playerRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const configRoutes_1 = __importDefault(require("./routes/configRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = (0, socket_1.initSocket)(httpServer);
const PORT = process.env.PORT || 5000;
// Standard production-ready CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, ''))
    : [];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // 1. Allow requests with no origin (like server-to-server or tools)
        if (!origin)
            return callback(null, true);
        const normalizedOrigin = origin.replace(/\/$/, '');
        // 2. Check if the origin matches any in our whitelisted environment variable
        // or if the whitelist contains '*' for development
        const isWhitelisted = allowedOrigins.some(allowed => allowed === normalizedOrigin || allowed === '*');
        // 3. Always allow localhost for development convenience
        const isLocal = /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin) ||
            /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin);
        if (isWhitelisted || isLocal) {
            // Mirrored origin back to browser - required for credentials: true
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked for origin: ${origin}. Add to FRONTEND_URL env if this is expected.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/players', playerRoutes_1.default);
app.use('/api/matches', matchRoutes_1.default);
app.use('/api/finance', financeRoutes_1.default);
app.use('/api/config', configRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
