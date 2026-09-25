// Goal work v1 HTTP boundary: fixed actions onto the owner-authorized goal_work_v1 RPC (Migration 074).
// A failed read is never an empty collection; every mutation outcome (committed or not) is a 200 receipt.
const reads = new Set(['tasks', 'milestones']);
const writes = new Set(['mutate']);
const headers = { 'Cache-Control': 'private, no-store' };

class GoalWorkRequestError extends Error {}

const statusFor = (code: string) =>
  code === 'UNAUTHORIZED' ? 401 : code === 'GOAL_UNAVAILABLE' ? 404 :
  code === 'CONTRACT_UNAVAILABLE' ? 503 :
  ['CURSOR_EXPIRED', 'OPERATION_PAYLOAD_MISMATCH'].includes(code) ? 409 : 422;

export async function goalWorkHTTP(request: Request, rpc: (action: string, payload: Record<string, unknown>) => Promise<unknown>): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? '';
  const allowed = request.method === 'GET' ? reads : request.method === 'POST' ? writes : new Set<string>();
  if (!allowed.has(action)) return Response.json({ ok: false, error: { code: 'INVALID_ACTION' } }, { status: 405, headers });
  try {
    let payload: Record<string, unknown>;
    if (request.method === 'GET') {
      payload = Object.fromEntries([...url.searchParams].filter(([key]) => key !== 'action'));
      if ('limit' in payload) {
        if (!/^[1-9][0-9]?$/.test(String(payload.limit))) throw new GoalWorkRequestError('limit');
        payload.limit = Number(payload.limit);
      }
    } else {
      const body = await request.text();
      if (Buffer.byteLength(body, 'utf8') > 16384) return Response.json({ ok: false, error: { code: 'PAYLOAD_TOO_LARGE' } }, { status: 413, headers });
      payload = JSON.parse(body);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new GoalWorkRequestError('payload');
      for (const key of ['fields', 'changes', 'schedule', 'progress']) {
        const value = payload[key];
        if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw new GoalWorkRequestError(key);
      }
    }
    const result = await rpc(action, payload) as { ok?: boolean; data?: unknown; error?: { code?: string } };
    if (result?.ok === true && result.data !== undefined) return Response.json(result, { headers });
    const code = result?.error?.code ?? 'CONTRACT_UNAVAILABLE';
    return Response.json({ ok: false, error: { code } }, { status: statusFor(code), headers });
  } catch (error) {
    const invalid = error instanceof SyntaxError || error instanceof GoalWorkRequestError;
    return Response.json({ ok: false, error: { code: invalid ? 'INVALID_FIELD' : 'CONTRACT_UNAVAILABLE' } }, { status: invalid ? 422 : 503, headers });
  }
}
