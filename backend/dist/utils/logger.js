"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = exports.AuditResource = exports.AuditAction = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditResource;
(function (AuditResource) {
    AuditResource["MATCH"] = "MATCH";
    AuditResource["PAYMENT"] = "PAYMENT";
    AuditResource["PLAYER"] = "PLAYER";
    AuditResource["EXPENSE"] = "EXPENSE";
    AuditResource["USER"] = "USER";
    AuditResource["CONFIG"] = "CONFIG";
    AuditResource["FINANCE"] = "FINANCE";
})(AuditResource || (exports.AuditResource = AuditResource = {}));
const logAction = async (userId, action, resource, resourceId, details) => {
    try {
        await prisma_1.default.auditLog.create({
            data: {
                userId,
                action,
                resource,
                resourceId,
                details: details || {}
            }
        });
    }
    catch (error) {
        console.error('Failed to log action:', error);
    }
};
exports.logAction = logAction;
