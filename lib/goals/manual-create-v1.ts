import { createHash } from 'node:crypto';
import { PRODUCT_CATEGORIES, type ProductCategory } from './product-categories.ts';

export class ManualGoalValidationError extends Error {
  readonly field: string; readonly code: string;
  constructor(field: string, code: string) { super(`${field}:${code}`); this.field = field; this.code = code; }
}
export interface ManualGoalFields {
  title: string; category: ProductCategory; description: string | null; endDate: string | null;
}
const edges = /^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu;
function fail(field: string, code: string): never { throw new ManualGoalValidationError(field, code); }
function text(value: unknown, field: string, limit: number): string {
  if (typeof value !== 'string') fail(field, 'INVALID_TYPE');
  if (!value.isWellFormed() || value.includes('\0')) fail(field, 'INVALID_UNICODE');
  const result = value.normalize('NFC').replace(edges, '');
  if ([...result].length > limit) fail(field, 'TOO_LONG');
  return result;
}
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const days = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1];
}
export function manualGoalV1(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('fields', 'INVALID_TYPE');
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !['title', 'category', 'description', 'endDate'].includes(key)) fail('fields', 'UNSUPPORTED_FIELD');
  }
  const p = input as Record<string, unknown>;
  const title = text(p.title, 'title', 200);
  if (!title) fail('title', 'REQUIRED');
  if (!(PRODUCT_CATEGORIES as readonly unknown[]).includes(p.category)) fail('category', 'INVALID_CATEGORY');
  const description = p.description == null ? null : text(p.description, 'description', 2000) || null;
  const endDate = p.endDate == null ? null : p.endDate;
  if (endDate !== null && !isCalendarDate(endDate)) fail('endDate', 'INVALID_DATE');
  const fields: ManualGoalFields = { title, category: p.category as ProductCategory, description, endDate: endDate as string | null };
  const canonical = JSON.stringify([1, 'goal.create.manual', title, fields.category, description, endDate]);
  return { fields, canonical, digest: createHash('sha256').update(canonical, 'utf8').digest('hex') };
}
