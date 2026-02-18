import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    name: string;
  };
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  name: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Internal server error' });
    }
    const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access Denied: You do not have the required permissions to access this resource.' 
      });
    }
    next();
  };
};
