import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

interface OngoingMatch {
  id: string;
  playerAId: string;
  playerBId: string;
  points: number;
  table: string;
  startTime: number;
  startedBy: string; // User ID
}

let currentLiveMatch: OngoingMatch | null = null;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current live match on connection
    socket.emit('live-match-sync', currentLiveMatch);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const getCurrentLiveMatch = () => currentLiveMatch;

export const startLiveMatch = (match: OngoingMatch) => {
  if (currentLiveMatch) {
    throw new Error('A match is already in progress on this table');
  }
  currentLiveMatch = match;
  io.emit('live-match-sync', currentLiveMatch);
};

export const stopLiveMatch = () => {
  currentLiveMatch = null;
  io.emit('live-match-sync', null);
};

export const notifyDataUpdate = (type: string) => {
  if (io) {
    io.emit('data-updated', { type });
  }
};
