import type {
  SessionDatabaseRecord,
  SessionSummaryDraft,
  SessionVerificationResult,
} from '@/features/sessions/types';

export const SESSION_EVENT_TYPES = [
  'change',
  'database_record',
  'verification',
  'failure',
  'note',
] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requiredString(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const trimmed = value
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters`);
  return trimmed;
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength = 2000,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`${field} must be a string or null`);
  const trimmed = value
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters`);
  return trimmed;
}

export function requiredUuid(value: unknown, field: string): string {
  const id = requiredString(value, field, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`${field} must be a UUID`);
  }
  return id;
}

export function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requiredUuid(value, field);
}

export function requiredDate(value: unknown, field: string): string {
  const date = requiredString(value, field, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${field} must use YYYY-MM-DD`);
  }
  return date;
}

function validateStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((item, index) => requiredString(item, `${field}[${index}]`, 1000));
}

function validateDatabaseRecords(value: unknown): SessionDatabaseRecord[] {
  if (!Array.isArray(value)) throw new Error('databaseRecords must be an array');
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`databaseRecords[${index}] must be an object`);
    const operation = requiredString(item.operation, `databaseRecords[${index}].operation`, 20);
    if (!['created', 'updated', 'deleted'].includes(operation)) {
      throw new Error(`databaseRecords[${index}].operation is invalid`);
    }
    return {
      table: requiredString(item.table, `databaseRecords[${index}].table`, 100),
      id: requiredString(item.id, `databaseRecords[${index}].id`, 200),
      operation: operation as SessionDatabaseRecord['operation'],
    };
  });
}

function validateVerificationResults(value: unknown): SessionVerificationResult[] {
  if (!Array.isArray(value)) throw new Error('verificationResults must be an array');
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`verificationResults[${index}] must be an object`);
    const status = requiredString(item.status, `verificationResults[${index}].status`, 20);
    if (!['passed', 'failed', 'warning'].includes(status)) {
      throw new Error(`verificationResults[${index}].status is invalid`);
    }
    const details = optionalString(item.details, `verificationResults[${index}].details`, 2000);
    return {
      name: requiredString(item.name, `verificationResults[${index}].name`, 200),
      status: status as SessionVerificationResult['status'],
      ...(details ? { details } : {}),
    };
  });
}

export function validateSessionSummary(value: unknown): SessionSummaryDraft {
  if (!isRecord(value)) throw new Error('summary must be an object');
  return {
    changedFiles: validateStringArray(value.changedFiles, 'changedFiles'),
    databaseRecords: validateDatabaseRecords(value.databaseRecords),
    verificationResults: validateVerificationResults(value.verificationResults),
    unresolvedFailures: validateStringArray(value.unresolvedFailures, 'unresolvedFailures'),
    reflection: requiredString(value.reflection, 'reflection', 10000),
  };
}

export function renderSessionSummary(summary: SessionSummaryDraft): string {
  const files = summary.changedFiles.length
    ? summary.changedFiles.map((file) => `- ${file}`).join('\n')
    : '- None';
  const records = summary.databaseRecords.length
    ? summary.databaseRecords
        .map((record) => `- ${record.operation}: ${record.table} (${record.id})`)
        .join('\n')
    : '- None';
  const verification = summary.verificationResults.length
    ? summary.verificationResults
        .map((result) => `- ${result.status}: ${result.name}${result.details ? ` — ${result.details}` : ''}`)
        .join('\n')
    : '- None';
  const failures = summary.unresolvedFailures.length
    ? summary.unresolvedFailures.map((failure) => `- ${failure}`).join('\n')
    : '- None';

  return [
    summary.reflection,
    '',
    'Changed files',
    files,
    '',
    'Database records',
    records,
    '',
    'Verification results',
    verification,
    '',
    'Unresolved failures',
    failures,
  ].join('\n');
}
