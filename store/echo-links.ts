import { create } from 'zustand';
import supabase from '@/lib/db/client';
import type { EchoEntryWithLink, EchoGoalLink } from '@/types/echo-link';

interface EchoLinksStore {
  links: EchoGoalLink[];
  echoEntries: EchoEntryWithLink[];
  unconfirmedCount: number;
  isLoading: boolean;
  error: string | null;
  fetchLinksForGoal: (goalId: string) => Promise<void>;
  confirmLink: (linkId: string) => Promise<void>;
  dismissLink: (linkId: string) => Promise<void>;
  createManualLink: (echoEntryId: string, goalId: string) => Promise<void>;
}

type ApiErrorBody = {
  error?: string;
};

type EchoLinkResponse = {
  link: EchoGoalLink;
};

type DeleteEchoLinkResponse = {
  success: boolean;
};

async function getAuthSession(): Promise<{ accessToken: string; userId: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  const userId = session?.user?.id;

  if (!accessToken || !userId) {
    throw new Error('Not authenticated');
  }

  return { accessToken, userId };
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let body: T | ApiErrorBody | null = null;

  try {
    body = (await response.json()) as T | ApiErrorBody;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : fallbackMessage;

    throw new Error(message);
  }

  if (!body) {
    throw new Error(fallbackMessage);
  }

  return body as T;
}

function createTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function countUnconfirmedLinks(links: EchoGoalLink[]): number {
  return links.filter((link) => !link.confirmed).length;
}

function buildOptimisticLink(
  tempId: string,
  echoEntryId: string,
  goalId: string,
): EchoGoalLink {
  return {
    id: tempId,
    echoEntryId,
    goalId,
    linkSource: 'manual',
    confidence: null,
    confirmed: true,
    createdAt: new Date().toISOString(),
  };
}

export const useEchoLinksStore = create<EchoLinksStore>((set, get) => ({
  links: [],
  echoEntries: [],
  unconfirmedCount: 0,
  isLoading: false,
  error: null,

  fetchLinksForGoal: async (goalId) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const { accessToken } = await getAuthSession();

      const response = await fetch(
        `/api/echo-links/${encodeURIComponent(goalId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await parseApiResponse<{ echoEntries: EchoEntryWithLink[] }>(
        response,
        'Failed to load echo links'
      );

      const links = data.echoEntries.map((entry) => entry.linkMetadata);

      set({
        links,
        echoEntries: data.echoEntries,
        unconfirmedCount: countUnconfirmedLinks(links),
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load echo links',
        isLoading: false,
      });
    }
  },

  confirmLink: async (linkId) => {
    const currentLink = get().links.find((link) => link.id === linkId);
    const currentEchoEntry = get().echoEntries.find((entry) => entry.linkMetadata.id === linkId);

    if (!currentLink) {
      return;
    }

    set((state) => {
      const links = state.links.map((link) =>
        link.id === linkId ? { ...link, confirmed: true } : link
      );
      const echoEntries = state.echoEntries.map((entry) =>
        entry.linkMetadata.id === linkId
          ? { ...entry, linkMetadata: { ...entry.linkMetadata, confirmed: true } }
          : entry
      );

      return {
        error: null,
        links,
        echoEntries,
        unconfirmedCount: countUnconfirmedLinks(links),
      };
    });

    try {
      const { accessToken } = await getAuthSession();
      const response = await fetch(`/api/echo-links/${encodeURIComponent(linkId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await parseApiResponse<EchoLinkResponse>(response, 'Failed to confirm echo link');

      set((state) => {
        const links = state.links.map((link) => (link.id === linkId ? data.link : link));
        const echoEntries = state.echoEntries.map((entry) =>
          entry.linkMetadata.id === linkId
            ? { ...entry, linkMetadata: data.link }
            : entry
        );

        return {
          links,
          echoEntries,
          unconfirmedCount: countUnconfirmedLinks(links),
        };
      });
    } catch (err) {
      set((state) => {
        const links = state.links.map((link) => (link.id === linkId ? currentLink : link));
        const echoEntries = state.echoEntries.map((entry) =>
          entry.linkMetadata.id === linkId && currentEchoEntry
            ? currentEchoEntry
            : entry
        );

        return {
          error: err instanceof Error ? err.message : 'Failed to confirm echo link',
          links,
          echoEntries,
          unconfirmedCount: countUnconfirmedLinks(links),
        };
      });
    }
  },

  dismissLink: async (linkId) => {
    const linkIndex = get().links.findIndex((link) => link.id === linkId);
    const echoEntryIndex = get().echoEntries.findIndex((entry) => entry.linkMetadata.id === linkId);

    if (linkIndex === -1) {
      return;
    }

    const removedLink = get().links[linkIndex];
    const removedEchoEntry = echoEntryIndex === -1 ? null : get().echoEntries[echoEntryIndex];

    set((state) => {
      const links = state.links.filter((link) => link.id !== linkId);
      const echoEntries = state.echoEntries.filter((entry) => entry.linkMetadata.id !== linkId);

      return {
        error: null,
        links,
        echoEntries,
        unconfirmedCount: countUnconfirmedLinks(links),
      };
    });

    try {
      const { accessToken } = await getAuthSession();
      const response = await fetch(`/api/echo-links/${encodeURIComponent(linkId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await parseApiResponse<DeleteEchoLinkResponse>(response, 'Failed to dismiss echo link');
    } catch (err) {
      set((state) => {
        const links = [...state.links];
        const echoEntries = [...state.echoEntries];

        links.splice(linkIndex, 0, removedLink);

        if (removedEchoEntry) {
          echoEntries.splice(echoEntryIndex, 0, removedEchoEntry);
        }

        return {
          error: err instanceof Error ? err.message : 'Failed to dismiss echo link',
          links,
          echoEntries,
          unconfirmedCount: countUnconfirmedLinks(links),
        };
      });
    }
  },

  createManualLink: async (echoEntryId, goalId) => {
    const tempId = createTempId();
    const optimisticLink = buildOptimisticLink(tempId, echoEntryId, goalId);

    set((state) => {
      const links = [optimisticLink, ...state.links];

      return {
        error: null,
        links,
        unconfirmedCount: countUnconfirmedLinks(links),
      };
    });

    try {
      const { accessToken } = await getAuthSession();
      const response = await fetch('/api/echo-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ echoEntryId, goalId }),
      });
      const data = await parseApiResponse<EchoLinkResponse>(
        response,
        'Failed to create echo link',
      );

      set((state) => {
        const links = state.links.map((link) => (link.id === tempId ? data.link : link));
        const echoEntries = state.echoEntries.map((entry) =>
          entry.id === echoEntryId
            ? { ...entry, linkMetadata: data.link }
            : entry
        );

        return {
          links,
          echoEntries,
          unconfirmedCount: countUnconfirmedLinks(links),
        };
      });
    } catch (err) {
      set((state) => {
        const links = state.links.filter((link) => link.id !== tempId);

        return {
          error: err instanceof Error ? err.message : 'Failed to create echo link',
          links,
          unconfirmedCount: countUnconfirmedLinks(links),
        };
      });
    }
  },
}));
