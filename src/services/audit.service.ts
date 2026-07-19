import prisma from '../config/database'
import logger from '../utils/logger'
import { AuditEntry } from '../types/account.types'

export class AuditService {
  /**
   * Write an audit log entry. Never throws — auditing must not break the
   * flow being audited. Failures are logged instead.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({ data: this.toData(entry) })
    } catch (error) {
      logger.error('[AuditService] Failed to write audit log:', error)
    }
  }

  /**
   * Build an auditLog.create operation for inclusion in a prisma.$transaction
   * array, so the audit entry commits atomically with the audited change.
   */
  op(entry: AuditEntry) {
    return prisma.auditLog.create({ data: this.toData(entry) })
  }

  private toData(entry: AuditEntry) {
    return {
      userId: entry.userId,
      action: entry.action,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    }
  }
}

export const auditService = new AuditService()
