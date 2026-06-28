import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initSocket } from './socket';
import authRoutes from './routes/authRoutes';
import playerRoutes from './routes/playerRoutes';
import matchRoutes from './routes/matchRoutes';
import financeRoutes from './routes/financeRoutes';
import configRoutes from './routes/configRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = initSocket(httpServer);
const PORT = process.env.PORT || 5000;

// Standard production-ready CORS configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, '')) 
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (like server-to-server or tools)
    if (!origin) return callback(null, true);
    
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
    } else {
      console.warn(`CORS blocked for origin: ${origin}. Add to FRONTEND_URL env if this is expected.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
