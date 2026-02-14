"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const playerRoutes_1 = __importDefault(require("./routes/playerRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const configRoutes_1 = __importDefault(require("./routes/configRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());

// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/players', playerRoutes_1.default);
app.use('/api/matches', matchRoutes_1.default);
app.use('/api/finance', financeRoutes_1.default);
app.use('/api/config', configRoutes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
