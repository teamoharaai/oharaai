import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { listSentGoalInvites } from '@/lib/db/circles';

// CD-014: the owner's sent list shows declined invites as "Pending".
export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const invites = await listSentGoalInvites(
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ invites });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load sent invites.');
  }
}
