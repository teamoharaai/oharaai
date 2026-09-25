// Goal Card v1 HTTP boundary: fixed actions onto the owner-authorized goal_card_v1 RPC.
// A failed read is never reported as an empty collection; mutation outcomes are terminal receipts.
const reads = new Set(['entries', 'activity', 'mutation_lookup', 'mutation_discover']);
const writes = new Set(['mutate', 'mutation_close', 'mutation_ack']);
const headers = { 'Cache-Control': 'private, no-store' };
const integerParams = new Set(['limit', 'days']);

class GoalCardRequestError extends Error {}

export async function goalCardHTTP(request: Request, rpc: (action: string, payload: Record<string, unknown>) => Promise<unknown>): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? '';
  const allowed = request.method === 'GET' ? reads : request.method === 'POST' ? writes : new Set<string>();
  if (!allowed.has(action)) return Response.json({ ok: false, error: { code: 'INVALID_ACTION' } }, { status: 405, headers });
  try {
    let payload: Record<string, unknown>;
    if (request.method === 'GET') {
      payload = Object.fromEntries([...url.searchParams].filter(([key]) => key !== 'action'));
      for (const key of integerParams) {
        if (!(key in payload)) continue;
        if (!/^[1-9][0-9]{0,2}$/.test(String(payload[key]))) throw new GoalCardRequestError(key);
        payload[key] = Number(payload[key]);
      }
    } else {
      const body = await request.text();
      if (Buffer.byteLength(body, 'utf8') > 16384) return Response.json({ ok: false, error: { code: 'PAYLOAD_TOO_LARGE' } }, { status: 413, headers });
      payload = JSON.parse(body);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new GoalCardRequestError('payload');
      const changes = (payload as { changes?: unknown }).changes;
      if (changes !== undefined && (!changes || typeof changes !== 'object' || Array.isArray(changes))) throw new GoalCardRequestError('changes');
    }
    const result = await rpc(action, payload) as { ok?: boolean; data?: unknown; error?: { code?: string } };
    if (result?.ok === true && result.data !== undefined) return Response.json(result, { headers });
    const code = result?.error?.code ?? 'CONTRACT_UNAVAILABLE';
    const status = code === 'UNAUTHORIZED' ? 401 : code === 'GOAL_UNAVAILABLE' ? 404 :
      ['DATE_CONTEXT_UNAVAILABLE', 'HISTORY_UNAVAILABLE', 'CONTRACT_UNAVAILABLE'].includes(code) ? 503 :
      ['CURSOR_EXPIRED', 'OPERATION_PAYLOAD_MISMATCH', 'DATE_CONTEXT_CHANGED'].includes(code) ? 409 : 422;
    return Response.json({ ok: false, error: { code } }, { status, headers });
  } catch (error) {
    const invalid = error instanceof SyntaxError || error instanceof GoalCardRequestError;
    return Response.json({ ok: false, error: { code: invalid ? 'INVALID_FIELD' : 'CONTRACT_UNAVAILABLE' } }, { status: invalid ? 422 : 503, headers });
  }
}
