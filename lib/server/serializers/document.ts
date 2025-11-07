// lib/server/serializers/document.ts
import type { Document as ApplicationDocument } from '@/lib/types';

export const serializeDocument = (document: Partial<ApplicationDocument>) => ({
  id: document.id ?? null,
  application_id: document.application_id ?? null,
  application_type: document.application_type ?? null,
  document_type: document.document_type ?? null,
  file_name: document.file_name ?? null,
  file_path: document.file_path ?? null,
  file_size: document.file_size ?? null,
  mime_type: document.mime_type ?? null,
  meta: document.meta ?? null,
});

