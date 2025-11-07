// lib/server/audit-logger.ts
// Helper for recording audit trail entries from API handlers.

import type { NextRequest } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import type { AuditLog } from '@/lib/types';
import { getRequestContext } from './request-context';

export type AuditAction = 'create' | 'update' | 'delete' | string;

export interface RecordAuditLogParams {
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export const recordAuditLog = async (
  request: NextRequest,
  params: RecordAuditLogParams
): Promise<AuditLog | null> => {
  try {
    const context = await getRequestContext(request);

    const log = await DatabaseService.createAuditLog({
      user_id: context.user?.id ?? null,
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    });

    return log;
  } catch (error) {
    console.error('Failed to record audit log:', error);
    return null;
  }
};

