import { createHash } from 'node:crypto';

// A stable operationId for the Milestone inserts createGoalWithMilestonesAndTrackers makes through
// goal_work_v1 (TD-005 B7), so a retried Goal create doesn't duplicate them: the same (goalId, index)
// always derives the same operationId, and goal_work_v1's own replay-by-identity handles the retry.
// Server-only (node:crypto); lib/db/goals.ts calls this only from API route handlers.
const MILESTONE_CREATE_NAMESPACE = '3d917822-3c23-44f9-ac31-8d999d23cdba';

function uuidv5(namespace: string, name: string): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1')
    .update(Buffer.concat([namespaceBytes, Buffer.from(name, 'utf8')]))
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function milestoneCreateOperationId(goalId: string, index: number): string {
  return uuidv5(MILESTONE_CREATE_NAMESPACE, `${goalId}:${index}`);
}
