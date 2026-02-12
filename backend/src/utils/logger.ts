import prisma from '../lib/prisma';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

export enum AuditResource {
  MATCH = 'MATCH',
  PAYMENT = 'PAYMENT',
  PLAYER = 'PLAYER',
  EXPENSE = 'EXPENSE',
  USER = 'USER',
  CONFIG = 'CONFIG',
  FINANCE = 'FINANCE'
}

export const logAction = async (
  userId: string,
  action: AuditAction,
  resource: AuditResource,
  resourceId?: string,
  details?: any
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details || {}
      }
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};
