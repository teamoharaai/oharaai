// Goal operations v1 HTTP boundary: lookup | discover (GET) and close | ack (POST) onto the owner-authorized
// goal_operations_v1 RPC (Migration 078), for every Goal protocol (goal.create, goal.mutate, goal.work).
// Status codes follow the other Goal routes; clients branch on error.code.
const reads = new Set(['lookup', 'discover']);
const writes = new Set(['close', 'ack']);
const headers = { 'Cache-Control': 'private, no-store' };

class GoalOperationsRequestError extends Error {}

const statusFor = (code: string) =>
  code === 'UNAUTHORIZED' ? 401 :
  // Not known (yet): the server has no record of this identity. A client decides with close, never by guessing.
  ['HISTORY_UNAVAILABLE', 'CONTRACT_UNAVAILABLE'].includes(code) ? 503 :
  ['CURSOR_EXPIRED', 'RECEIPT_REVISION_MISMATCH'].includes(code) ? 409 : 422;

export async function goalOperationsHTTP(request: Request, rpc: (action: string, payload: Record<string, unknown>) => Promise<unknown>): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? '';
  const allowed = request.method === 'GET' ? reads : request.method === 'POST' ? writes : new Set<string>();
  if (!allowed.has(action)) return Response.json({ ok: false, error: { code: 'INVALID_ACTION' } }, { status: 405, headers });
  try {
    let payload: Record<string, unknown>;
    if (request.method === 'GET') {
      payload = Object.fromEntries([...url.searchParams].filter(([key]) => key !== 'action'));
      if ('limit' in payload) {
        if (!/^[1-9][0-9]?$/.test(String(payload.limit))) throw new GoalOperationsRequestError('limit');
        payload.limit = Number(payload.limit);
      }
    } else {
      const body = await request.text();
      if (Buffer.byteLength(body, 'utf8') > 4096) return Response.json({ ok: false, error: { code: 'PAYLOAD_TOO_LARGE' } }, { status: 413, headers });
      payload = JSON.parse(body);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new GoalOperationsRequestError('payload');
    }
    const result = await rpc(action, payload) as { ok?: boolean; data?: unknown; error?: { code?: string } };
    if (result?.ok === true && result.data !== undefined) return Response.json(result, { headers });
    const code = result?.error?.code ?? 'CONTRACT_UNAVAILABLE';
    return Response.json({ ok: false, error: { code } }, { status: statusFor(code), headers });
  } catch (error) {
    const invalid = error instanceof SyntaxError || error instanceof GoalOperationsRequestError;
    return Response.json({ ok: false, error: { code: invalid ? 'INVALID_FIELD' : 'CONTRACT_UNAVAILABLE' } }, { status: invalid ? 422 : 503, headers });
  }
}
