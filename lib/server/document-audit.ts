// lib/server/document-audit.ts
import type { NextRequest } from 'next/server';
import type { Document as ApplicationDocument } from '@/lib/types';
import { recordAuditLog } from '@/lib/server/audit-logger';

const APPLICATION_TABLE_BY_TYPE: Record<string, string> = {
  'direct_hire': 'direct_hire_applications',
  'balik_manggagawa': 'balik_manggagawa_clearance',
  'gov_to_gov': 'gov_to_gov_applications',
  'information_sheet': 'information_sheet_records',
};

interface DocumentAuditOptions {
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  applicationOldValues?: Record<string, unknown> | null;
  applicationNewValues?: Record<string, unknown> | null;
}

export const recordDocumentAudit = async (
  request: NextRequest,
  action: 'create' | 'update' | 'delete',
  document: ApplicationDocument,
  options: DocumentAuditOptions = {}
) => {
  const docOldValues = options.oldValues ?? null;
  const docNewValues = options.newValues ?? {};

  await recordAuditLog(request, {
    action,
    tableName: 'documents',
    recordId: document.id,
    oldValues: docOldValues,
    newValues: docNewValues,
  });

  const applicationTable = APPLICATION_TABLE_BY_TYPE[document.application_type];
  if (!applicationTable) return;

  const applicationOld = options.applicationOldValues ?? null;
  const applicationNew = {
    document_name: document.document_type,
    ...(options.applicationNewValues ?? {}),
  };

  await recordAuditLog(request, {
    action,
    tableName: applicationTable,
    recordId: document.application_id,
    oldValues: applicationOld,
    newValues: applicationNew,
  });
};

