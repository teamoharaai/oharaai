import { manualGoalV1, ManualGoalValidationError } from './manual-create-v1.ts';
const reads = new Set(['capabilities','context','header','list','lookup','discover']);
const writes = new Set(['register','submit','close','ack']);
const headers = { 'Cache-Control': 'private, no-store' };
export async function manualGoalHTTP(request: Request, rpc: (action: string, payload: Record<string, unknown>) => Promise<unknown>): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? '';
  if (!(request.method === 'GET' ? reads : request.method === 'POST' ? writes : new Set()).has(action)) return Response.json({ok:false,error:{code:'INVALID_ACTION'}},{status:405,headers});
  try {
    let payload: Record<string, unknown>;
    if (request.method === 'GET') {
      payload = Object.fromEntries([...url.searchParams].filter(([key])=>key !== 'action'));
      if ('limit' in payload) {
        if (!/^[1-9][0-9]{0,2}$/.test(String(payload.limit))) throw new ManualGoalValidationError('limit','INVALID_FIELD');
        payload.limit = Number(payload.limit);
      }
    } else {
      const body = await request.text();
      if (Buffer.byteLength(body,'utf8') > 16384) return Response.json({ok:false,error:{code:'PAYLOAD_TOO_LARGE'}},{status:413,headers});
      payload = JSON.parse(body);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ManualGoalValidationError('payload','INVALID_FIELD');
      if (action === 'submit') manualGoalV1(payload.fields); // Never replace the submitted binding or silently remove extra fields.
    }
    const result = await rpc(action,payload) as {ok?:boolean;data?:unknown;error?:{code?:string}};
    if (result?.ok === true && result.data !== undefined) return Response.json(result,{headers});
    const code = result?.error?.code ?? 'CONTRACT_UNAVAILABLE';
    const status = code === 'UNAUTHORIZED' ? 401 : code === 'GOAL_UNAVAILABLE' ? 404 :
      ['CREATION_UNAVAILABLE','DATE_CONTEXT_UNAVAILABLE','GOAL_CONTRACT_INVALID','CONTRACT_UNAVAILABLE','HISTORY_UNAVAILABLE'].includes(code) ? 503 :
      ['CURSOR_EXPIRED','OPERATION_PAYLOAD_MISMATCH','DATE_CONTEXT_CHANGED','GOAL_CONTRACT_UNSUPPORTED'].includes(code) ? 409 : 422;
    return Response.json({ok:false,error:{code}},{status,headers});
  } catch (error) {
    const invalid = error instanceof SyntaxError || error instanceof ManualGoalValidationError;
    return Response.json({ok:false,error:{code:invalid?'INVALID_FIELD':'CONTRACT_UNAVAILABLE'}},{status:invalid?422:503,headers});
  }
}
