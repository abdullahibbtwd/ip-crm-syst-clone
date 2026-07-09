import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action: string;
  resource: string;
  module?: string;
  skip?: boolean;
  /** Logs action as personal_data_export (GDPR export trace). */
  personalDataExport?: boolean;
}

export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
export const SkipAudit = () => SetMetadata(AUDIT_KEY, { skip: true });
