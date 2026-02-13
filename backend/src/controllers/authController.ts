import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Only allow SUPER_ADMIN to register certain roles if needed, 
    // or keep it open for the first user
    const userCount = await prisma.user.count();
    const finalRole = userCount === 0 ? UserRole.SUPER_ADMIN : (role || UserRole.STAFF);

    const hashedEmail = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: hashedEmail } });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: hashedEmail,
        password: hashedPassword,
        name,
        role: finalRole
      }
    });

    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const userId = id as string;
    
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    res.json({ id: user.id, role: user.role });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
