import type {
  FriendClientError,
  FriendErrorDetails,
  FriendMutationResult,
  FriendMutationState,
  FriendsSnapshot,
  IncomingRequest,
  PersonSummary,
  SearchResult,
  SentRequest,
} from './types';

export const FRIENDS_SEARCH_MIN_LENGTH = 3;
export const FRIENDS_SEARCH_MAX_LENGTH = 20;
export const FRIENDS_SEARCH_DEBOUNCE_MS = 250;

export interface FriendsState {
  friends: PersonSummary[];
  friendCount: number;
  incomingRequests: IncomingRequest[];
  sentRequests: SentRequest[];
  hasHydrated: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  loadError: FriendClientError | null;
  connectionMutations: Record<string, FriendMutationState>;
  sendMutations: Record<string, FriendMutationState>;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearchLoading: boolean;
  searchError: FriendClientError | null;
}

export interface FriendsActions {
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  acceptRequest: (connectionId: string) => Promise<void>;
  declineRequest: (connectionId: string) => Promise<void>;
  sendRequest: (person: PersonSummary) => Promise<void>;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

export type FriendsStoreState = FriendsState & FriendsActions;

export interface FriendsClientService {
  fetchSnapshot: (signal?: AbortSignal) => Promise<FriendsSnapshot>;
  search: (
    usernamePrefix: string,
    signal?: AbortSignal,
  ) => Promise<SearchResult[]>;
  accept: (
    connectionId: string,
    signal?: AbortSignal,
  ) => Promise<FriendMutationResult>;
  decline: (
    connectionId: string,
    signal?: AbortSignal,
  ) => Promise<FriendMutationResult>;
  send: (
    addresseeId: string,
    signal?: AbortSignal,
  ) => Promise<FriendMutationResult>;
}

type StateUpdate =
  | Partial<FriendsState>
  | ((state: FriendsStoreState) => Partial<FriendsState>);

export interface FriendsStateAdapter {
  get: () => FriendsStoreState;
  set: (update: StateUpdate) => void;
}

interface FriendsControllerOptions {
  debounceMs?: number;
  now?: () => Date;
}

interface OptimisticRequestPatch {
  request: IncomingRequest;
  priorFriend: PersonSummary | null;
  priorSearchRelation: SearchResult['relation'] | null;
  dataProfileRevision: number;
  dataConnectionRevision: number;
  searchRevision: number;
}

const IDLE_MUTATION: FriendMutationState = {
  isBusy: false,
  error: null,
};

const API_ERROR_CODES = new Set<FriendClientError['code']>([
  'UNAUTHORIZED',
  'INVALID_INPUT',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
  'UNKNOWN_ERROR',
]);

export function createInitialFriendsState(): FriendsState {
  return {
    friends: [],
    friendCount: 0,
    incomingRequests: [],
    sentRequests: [],
    hasHydrated: false,
    isInitialLoading: false,
    isRefreshing: false,
    loadError: null,
    connectionMutations: {},
    sendMutations: {},
    searchQuery: '',
    searchResults: [],
    isSearchLoading: false,
    searchError: null,
  };
}

function compareText(left: string, right: string): number {
  const normalizedLeft = left.toLocaleLowerCase('en-US');
  const normalizedRight = right.toLocaleLowerCase('en-US');
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortPeople(people: PersonSummary[]): PersonSummary[] {
  return [...people].sort(
    (left, right) =>
      compareText(left.username, right.username)
      || compareText(left.display_name, right.display_name)
      || compareText(left.id, right.id),
  );
}

function sortRequestsNewest<T extends IncomingRequest | SentRequest>(
  requests: T[],
): T[] {
  return [...requests].sort(
    (left, right) =>
      Date.parse(right.created_at) - Date.parse(left.created_at)
      || compareText(left.id, right.id),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDetails(value: unknown): FriendErrorDetails | null {
  if (!isRecord(value) || typeof value.reason !== 'string') return null;
  if (value.reason === 'cooldown') {
    return (
      typeof value.cooldown_days === 'number'
      && (typeof value.retry_at === 'string' || value.retry_at === null)
    )
      ? {
          reason: 'cooldown',
          cooldown_days: value.cooldown_days,
          retry_at: value.retry_at,
        }
      : null;
  }

  switch (value.reason) {
    case 'profile_not_found':
    case 'already_connected':
    case 'pending_incoming':
    case 'request_not_found':
    case 'already_handled':
    case 'forbidden_transition':
      return { reason: value.reason };
    default:
      return null;
  }
}

function normalizeError(
  error: unknown,
  fallbackMessage: string,
): FriendClientError {
  if (!isRecord(error)) {
    return {
      message: error instanceof Error ? error.message : fallbackMessage,
      code: null,
      details: null,
    };
  }

  const code = API_ERROR_CODES.has(
    error.code as FriendClientError['code'],
  )
    ? (error.code as FriendClientError['code'])
    : null;

  return {
    message:
      typeof error.message === 'string' ? error.message : fallbackMessage,
    code,
    details: normalizeDetails(error.details),
  };
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error
    && (error.name === 'AbortError' || error.name === 'CanceledError')
  );
}

function profileIdsInState(state: FriendsState): Set<string> {
  return new Set([
    ...state.friends.map((person) => person.id),
    ...state.incomingRequests.map((request) => request.from.id),
    ...state.sentRequests.map((request) => request.to.id),
  ]);
}

function connectionIdsInState(state: FriendsState): Set<string> {
  return new Set([
    ...state.incomingRequests.map((request) => request.id),
    ...state.sentRequests.map((request) => request.id),
  ]);
}

function localRelationship(
  state: FriendsState,
  profileId: string,
): SearchResult['relation'] {
  if (state.friends.some((person) => person.id === profileId)) {
    return 'friends';
  }
  if (
    state.incomingRequests.some(
      (request) => request.from.id === profileId,
    )
  ) {
    return 'pending_in';
  }
  if (
    state.sentRequests.some((request) => request.to.id === profileId)
  ) {
    return 'pending_out';
  }
  return 'none';
}

function snapshotToState(snapshot: FriendsSnapshot): FriendsState {
  return {
    ...createInitialFriendsState(),
    friends: snapshot.friends,
    friendCount: snapshot.friend_count,
    incomingRequests: snapshot.incoming_requests,
    sentRequests: snapshot.sent_requests,
    hasHydrated: true,
  };
}

function setMutationState(
  mutations: Record<string, FriendMutationState>,
  key: string,
  value: FriendMutationState,
): Record<string, FriendMutationState> {
  return { ...mutations, [key]: value };
}

export function createFriendsStateController(
  adapter: FriendsStateAdapter,
  service: FriendsClientService,
  options: FriendsControllerOptions = {},
): FriendsActions {
  const debounceMs =
    options.debounceMs ?? FRIENDS_SEARCH_DEBOUNCE_MS;
  const now = options.now ?? (() => new Date());

  let generation = 0;
  let loadPromise: Promise<void> | null = null;
  let loadToken: symbol | null = null;
  let loadController: AbortController | null = null;
  let refreshQueued = false;

  let searchVersion = 0;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let searchController: AbortController | null = null;

  const mutationTokens = new Map<string, symbol>();
  const mutationControllers = new Map<string, AbortController>();

  let dataRevisionClock = 0;
  let searchRevisionClock = 0;
  let relationshipClock = 0;
  let committedRelationshipClock = 0;
  const dataProfileRevisions = new Map<string, number>();
  const dataConnectionRevisions = new Map<string, number>();
  const searchRevisions = new Map<string, number>();
  const relationshipRevisions = new Map<string, number>();
  const committedRelationshipRevisions = new Map<string, number>();

  const touchDataProfile = (profileId: string): number => {
    const revision = ++dataRevisionClock;
    dataProfileRevisions.set(profileId, revision);
    return revision;
  };

  const touchDataConnection = (connectionId: string): number => {
    const revision = ++dataRevisionClock;
    dataConnectionRevisions.set(connectionId, revision);
    return revision;
  };

  const touchSearch = (profileId: string): number => {
    const revision = ++searchRevisionClock;
    searchRevisions.set(profileId, revision);
    return revision;
  };

  const touchRelationship = (profileId: string): void => {
    relationshipRevisions.set(profileId, ++relationshipClock);
  };

  const commitRelationship = (profileId: string): void => {
    committedRelationshipRevisions.set(
      profileId,
      ++committedRelationshipClock,
    );
  };

  const applySnapshot = (
    snapshot: FriendsSnapshot,
    commitClockAtRequestStart: number,
  ): void => {
    const current = adapter.get();
    const next = snapshotToState(snapshot);
    let overlaidCommittedRelationship = false;

    for (const [profileId, revision] of committedRelationshipRevisions) {
      if (revision <= commitClockAtRequestStart) continue;
      overlaidCommittedRelationship = true;

      next.friends = next.friends.filter(
        (person) => person.id !== profileId,
      );
      next.incomingRequests = next.incomingRequests.filter(
        (request) => request.from.id !== profileId,
      );
      next.sentRequests = next.sentRequests.filter(
        (request) => request.to.id !== profileId,
      );

      const currentFriend = current.friends.find(
        (person) => person.id === profileId,
      );
      const currentIncoming = current.incomingRequests.find(
        (request) => request.from.id === profileId,
      );
      const currentSent = current.sentRequests.find(
        (request) => request.to.id === profileId,
      );

      if (currentFriend) next.friends.push(currentFriend);
      if (currentIncoming) next.incomingRequests.push(currentIncoming);
      if (currentSent) next.sentRequests.push(currentSent);
    }

    next.friends = sortPeople(next.friends);
    next.friendCount = overlaidCommittedRelationship
      ? next.friends.length
      : snapshot.friend_count;
    next.incomingRequests = sortRequestsNewest(next.incomingRequests);
    next.sentRequests = sortRequestsNewest(next.sentRequests);

    const touchedProfiles = new Set([
      ...profileIdsInState(current),
      ...profileIdsInState(next),
    ]);
    const touchedConnections = new Set([
      ...connectionIdsInState(current),
      ...connectionIdsInState(next),
    ]);
    for (const profileId of touchedProfiles) {
      touchDataProfile(profileId);
      touchRelationship(profileId);
      if (
        current.searchResults.some(
          (result) => result.id === profileId,
        )
      ) {
        touchSearch(profileId);
      }
    }
    for (const connectionId of touchedConnections) {
      touchDataConnection(connectionId);
    }

    adapter.set({
      friends: next.friends,
      friendCount: next.friendCount,
      incomingRequests: next.incomingRequests,
      sentRequests: next.sentRequests,
      hasHydrated: true,
      loadError: null,
      searchResults: current.searchResults.map((result) =>
        touchedProfiles.has(result.id) && result.relation !== 'self'
          ? {
              ...result,
              relation: localRelationship(next, result.id),
            }
          : result,
      ),
    });
  };

  const startLoad = (initial: boolean): Promise<void> => {
    const token = Symbol('friends-load');
    const startedGeneration = generation;
    loadToken = token;

    const run = async (): Promise<void> => {
      let initialCycle = initial;

      while (true) {
        if (initialCycle) {
          adapter.set({
            isInitialLoading: true,
            loadError: null,
          });
        } else {
          adapter.set({
            isInitialLoading: false,
            isRefreshing: true,
            loadError: null,
          });
        }

        const commitClockAtRequestStart = committedRelationshipClock;
        const controller = new AbortController();
        loadController = controller;

        try {
          const snapshot = await service.fetchSnapshot(controller.signal);
          if (
            generation === startedGeneration
            && loadToken === token
          ) {
            applySnapshot(snapshot, commitClockAtRequestStart);
          }
        } catch (error) {
          if (
            generation === startedGeneration
            && loadToken === token
            && !isAbortError(error)
          ) {
            adapter.set({
              loadError: normalizeError(
                error,
                'Failed to load friends.',
              ),
            });
          }
        }

        if (
          generation !== startedGeneration
          || loadToken !== token
        ) {
          return;
        }

        if (!refreshQueued) break;
        refreshQueued = false;
        initialCycle = false;
      }

      adapter.set({
        isInitialLoading: false,
        isRefreshing: false,
      });
    };

    loadPromise = run().finally(() => {
      if (loadToken === token) {
        loadToken = null;
        loadPromise = null;
        loadController = null;
        refreshQueued = false;
        adapter.set({
          isInitialLoading: false,
          isRefreshing: false,
        });
      }
    });
    return loadPromise;
  };

  const hydrate = (): Promise<void> => {
    if (adapter.get().hasHydrated) return Promise.resolve();
    if (loadPromise) return loadPromise;
    return startLoad(true);
  };

  const refresh = (): Promise<void> => {
    if (loadPromise) {
      refreshQueued = true;
      adapter.set({ isRefreshing: true });
      return loadPromise;
    }
    return startLoad(false);
  };

  const beginRequestPatch = (
    request: IncomingRequest,
    relationship: 'friends' | 'none',
  ): OptimisticRequestPatch => {
    const state = adapter.get();
    const patch: OptimisticRequestPatch = {
      request,
      priorFriend:
        state.friends.find(
          (person) => person.id === request.from.id,
        ) ?? null,
      priorSearchRelation:
        state.searchResults.find(
          (result) => result.id === request.from.id,
        )?.relation ?? null,
      dataProfileRevision: touchDataProfile(request.from.id),
      dataConnectionRevision: touchDataConnection(request.id),
      searchRevision: touchSearch(request.from.id),
    };
    touchRelationship(request.from.id);

    adapter.set((current) => {
      const friends =
        relationship === 'friends'
          ? sortPeople([
              ...current.friends.filter(
                (person) => person.id !== request.from.id,
              ),
              request.from,
            ])
          : current.friends;
      return {
        incomingRequests: current.incomingRequests.filter(
          (item) => item.id !== request.id,
        ),
        friends,
        friendCount: friends.length,
        searchResults: current.searchResults.map((result) =>
          result.id === request.from.id
            ? { ...result, relation: relationship }
            : result,
        ),
      };
    });

    return patch;
  };

  const reapplySuccessfulRequest = (
    request: IncomingRequest,
    relationship: 'friends' | 'none',
  ): void => {
    touchDataProfile(request.from.id);
    touchDataConnection(request.id);
    touchSearch(request.from.id);
    touchRelationship(request.from.id);
    commitRelationship(request.from.id);

    adapter.set((current) => {
      const friends =
        relationship === 'friends'
          ? sortPeople([
              ...current.friends.filter(
                (person) => person.id !== request.from.id,
              ),
              request.from,
            ])
          : current.friends;
      return {
        incomingRequests: current.incomingRequests.filter(
          (item) => item.id !== request.id,
        ),
        friends,
        friendCount: friends.length,
        searchResults: current.searchResults.map((result) =>
          result.id === request.from.id
            ? { ...result, relation: relationship }
            : result,
        ),
      };
    });
  };

  const rollbackRequestPatch = (
    patch: OptimisticRequestPatch,
  ): void => {
    const profileId = patch.request.from.id;
    const canRollbackData =
      dataProfileRevisions.get(profileId)
        === patch.dataProfileRevision
      && dataConnectionRevisions.get(patch.request.id)
        === patch.dataConnectionRevision;
    const canRollbackSearch =
      searchRevisions.get(profileId) === patch.searchRevision;

    if (canRollbackData) {
      touchDataProfile(profileId);
      touchDataConnection(patch.request.id);
    }
    if (canRollbackSearch) touchSearch(profileId);
    if (canRollbackData || canRollbackSearch) {
      touchRelationship(profileId);
    }

    adapter.set((current) => {
      let friends = current.friends;
      let incomingRequests = current.incomingRequests;
      let searchResults = current.searchResults;

      if (canRollbackData) {
        friends = current.friends.filter(
          (person) => person.id !== profileId,
        );
        if (patch.priorFriend) {
          friends = sortPeople([...friends, patch.priorFriend]);
        }
        if (
          !current.incomingRequests.some(
            (request) => request.id === patch.request.id,
          )
        ) {
          incomingRequests = sortRequestsNewest([
            ...current.incomingRequests,
            patch.request,
          ]);
        }
      }

      if (canRollbackSearch && patch.priorSearchRelation) {
        searchResults = current.searchResults.map((result) =>
          result.id === profileId
            ? { ...result, relation: patch.priorSearchRelation! }
            : result,
        );
      }

      return {
        friends,
        friendCount: friends.length,
        incomingRequests,
        searchResults,
      };
    });
  };

  const respondToRequest = async (
    connectionId: string,
    response: 'accept' | 'decline',
  ): Promise<void> => {
    const mutation = adapter.get().connectionMutations[connectionId];
    if (mutation?.isBusy) return;

    const request = adapter
      .get()
      .incomingRequests.find((item) => item.id === connectionId);
    if (!request) {
      adapter.set((state) => ({
        connectionMutations: setMutationState(
          state.connectionMutations,
          connectionId,
          {
            isBusy: false,
            error: {
              message: 'This friend request is no longer available.',
              code: 'NOT_FOUND',
              details: { reason: 'request_not_found' },
            },
          },
        ),
      }));
      return;
    }

    const token = Symbol(`friends-${response}`);
    const startedGeneration = generation;
    const controller = new AbortController();
    mutationTokens.set(`connection:${connectionId}`, token);
    mutationControllers.set(`connection:${connectionId}`, controller);

    adapter.set((state) => ({
      connectionMutations: setMutationState(
        state.connectionMutations,
        connectionId,
        { isBusy: true, error: null },
      ),
    }));

    const patch = beginRequestPatch(
      request,
      response === 'accept' ? 'friends' : 'none',
    );
    const isCurrent = (): boolean =>
      generation === startedGeneration
      && mutationTokens.get(`connection:${connectionId}`) === token;

    try {
      if (response === 'accept') {
        await service.accept(connectionId, controller.signal);
      } else {
        await service.decline(connectionId, controller.signal);
      }

      if (!isCurrent()) return;
      reapplySuccessfulRequest(
        request,
        response === 'accept' ? 'friends' : 'none',
      );
      adapter.set((state) => ({
        connectionMutations: setMutationState(
          state.connectionMutations,
          connectionId,
          IDLE_MUTATION,
        ),
      }));
    } catch (error) {
      if (!isCurrent()) return;

      rollbackRequestPatch(patch);
      const normalized = normalizeError(
        error,
        response === 'accept'
          ? 'Failed to accept friend request.'
          : 'Failed to decline friend request.',
      );
      adapter.set((state) => ({
        connectionMutations: setMutationState(
          state.connectionMutations,
          connectionId,
          { isBusy: false, error: normalized },
        ),
      }));

      if (normalized.details?.reason === 'already_handled') {
        await refresh();
      }
    } finally {
      if (isCurrent()) {
        mutationTokens.delete(`connection:${connectionId}`);
        mutationControllers.delete(`connection:${connectionId}`);
        adapter.set((state) => ({
          connectionMutations: setMutationState(
            state.connectionMutations,
            connectionId,
            {
              isBusy: false,
              error:
                state.connectionMutations[connectionId]?.error ?? null,
            },
          ),
        }));
      }
    }
  };

  const acceptRequest = (connectionId: string): Promise<void> =>
    respondToRequest(connectionId, 'accept');

  const declineRequest = (connectionId: string): Promise<void> =>
    respondToRequest(connectionId, 'decline');

  const sendRequest = async (person: PersonSummary): Promise<void> => {
    const existing = adapter.get().sendMutations[person.id];
    if (existing?.isBusy) return;

    const token = Symbol('friends-send');
    const startedGeneration = generation;
    const key = `profile:${person.id}`;
    const controller = new AbortController();
    mutationTokens.set(key, token);
    mutationControllers.set(key, controller);
    adapter.set((state) => ({
      sendMutations: setMutationState(
        state.sendMutations,
        person.id,
        { isBusy: true, error: null },
      ),
    }));

    const isCurrent = (): boolean =>
      generation === startedGeneration
      && mutationTokens.get(key) === token;

    try {
      const result = await service.send(person.id, controller.signal);
      if (!isCurrent()) return;
      if (!result.id) {
        throw new Error(
          'Friend request did not return a connection ID.',
        );
      }

      const sentRequest: SentRequest = {
        id: result.id,
        created_at: now().toISOString(),
        to: person,
      };
      touchDataProfile(person.id);
      touchDataConnection(result.id);
      touchSearch(person.id);
      touchRelationship(person.id);
      commitRelationship(person.id);

      adapter.set((state) => ({
        sentRequests: sortRequestsNewest([
          sentRequest,
          ...state.sentRequests.filter(
            (request) =>
              request.id !== result.id && request.to.id !== person.id,
          ),
        ]),
        searchResults: state.searchResults.map((resultItem) =>
          resultItem.id === person.id
            ? { ...resultItem, relation: 'pending_out' }
            : resultItem,
        ),
        sendMutations: setMutationState(
          state.sendMutations,
          person.id,
          IDLE_MUTATION,
        ),
      }));
    } catch (error) {
      if (!isCurrent()) return;
      adapter.set((state) => ({
        sendMutations: setMutationState(
          state.sendMutations,
          person.id,
          {
            isBusy: false,
            error: normalizeError(
              error,
              'Failed to send friend request.',
            ),
          },
        ),
      }));
    } finally {
      if (isCurrent()) {
        mutationTokens.delete(key);
        mutationControllers.delete(key);
        adapter.set((state) => ({
          sendMutations: setMutationState(
            state.sendMutations,
            person.id,
            {
              isBusy: false,
              error: state.sendMutations[person.id]?.error ?? null,
            },
          ),
        }));
      }
    }
  };

  const cancelSearch = (): void => {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    searchController?.abort();
    searchController = null;
  };

  const setSearchQuery = (rawQuery: string): void => {
    const query = rawQuery
      .trim()
      .slice(0, FRIENDS_SEARCH_MAX_LENGTH);
    if (query === adapter.get().searchQuery) return;

    cancelSearch();
    const version = ++searchVersion;

    if (query.length < FRIENDS_SEARCH_MIN_LENGTH) {
      adapter.set({
        searchQuery: query,
        searchResults: [],
        isSearchLoading: false,
        searchError: null,
      });
      return;
    }

    adapter.set({
      searchQuery: query,
      searchResults: [],
      isSearchLoading: false,
      searchError: null,
    });

    const startedGeneration = generation;
    searchTimer = setTimeout(() => {
      searchTimer = null;
      if (
        generation !== startedGeneration
        || version !== searchVersion
      ) {
        return;
      }

      const controller = new AbortController();
      const relationshipClockAtRequestStart = relationshipClock;
      searchController = controller;
      adapter.set({ isSearchLoading: true, searchError: null });

      void service
        .search(query, controller.signal)
        .then((results) => {
          if (
            generation !== startedGeneration
            || version !== searchVersion
            || controller.signal.aborted
          ) {
            return;
          }

          const current = adapter.get();
          const mergedResults = results.map((result) => {
            const relationshipRevision =
              relationshipRevisions.get(result.id) ?? 0;
            return relationshipRevision > relationshipClockAtRequestStart
              ? {
                  ...result,
                  relation: localRelationship(current, result.id),
                }
              : result;
          });

          const touchedProfileIds = new Set([
            ...current.searchResults.map((result) => result.id),
            ...mergedResults.map((result) => result.id),
          ]);
          for (const profileId of touchedProfileIds) {
            touchSearch(profileId);
          }

          adapter.set({
            searchResults: mergedResults,
            isSearchLoading: false,
            searchError: null,
          });
        })
        .catch((error: unknown) => {
          if (
            generation !== startedGeneration
            || version !== searchVersion
            || isAbortError(error)
          ) {
            return;
          }
          adapter.set({
            isSearchLoading: false,
            searchError: normalizeError(
              error,
              'Failed to search for people.',
            ),
          });
        })
        .finally(() => {
          if (
            generation === startedGeneration
            && version === searchVersion
            && searchController === controller
          ) {
            searchController = null;
          }
        });
    }, debounceMs);
  };

  const reset = (): void => {
    generation += 1;
    refreshQueued = false;
    loadController?.abort();
    loadController = null;
    loadToken = null;
    loadPromise = null;
    cancelSearch();
    searchVersion += 1;

    for (const controller of mutationControllers.values()) {
      controller.abort();
    }
    mutationControllers.clear();
    mutationTokens.clear();

    dataRevisionClock = 0;
    searchRevisionClock = 0;
    relationshipClock = 0;
    committedRelationshipClock = 0;
    dataProfileRevisions.clear();
    dataConnectionRevisions.clear();
    searchRevisions.clear();
    relationshipRevisions.clear();
    committedRelationshipRevisions.clear();

    adapter.set(createInitialFriendsState());
  };

  return {
    hydrate,
    refresh,
    acceptRequest,
    declineRequest,
    sendRequest,
    setSearchQuery,
    reset,
  };
}
