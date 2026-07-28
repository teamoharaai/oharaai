import { ConstellationScreen } from '@/features/constellation/components/ConstellationScreen';
import supabase from '@/lib/db/client';

const ACCEPTANCE_ACCESS_TOKEN = 'constellation-acceptance-token';

/**
 * The isolated preview router has no authenticated app shell. Browser
 * acceptance tests intercept every owner-scoped API request, so this preview-
 * only session supplies the same bearer-token precondition as the real shell
 * without adding a production fixture or bypass to authedFetch.
 */
function configureAcceptanceSession() {
  if (!supabase?.auth) {
    throw new Error(
      'Constellation acceptance preview requires the preview Supabase environment.',
    );
  }

  const auth = supabase.auth as unknown as {
    getSession: () => Promise<{
      data: {
        session: {
          access_token: string;
        };
      };
      error: null;
    }>;
  };
  auth.getSession = async () => ({
    data: {
      session: {
        access_token: ACCEPTANCE_ACCESS_TOKEN,
      },
    },
    error: null,
  });
}

export default function ConstellationAcceptanceRoute() {
  configureAcceptanceSession();
  return <ConstellationScreen />;
}
