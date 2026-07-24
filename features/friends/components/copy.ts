import type { FriendClientError } from '@/features/friends/types';

function formatRetryAt(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function getFriendErrorCopy(
  error: FriendClientError,
  fallback: string,
): string {
  const details = error.details;

  if (details?.reason === 'cooldown') {
    const retryAt = details.retry_at
      ? formatRetryAt(details.retry_at)
      : null;
    if (retryAt) {
      return `You can send another request on ${retryAt}.`;
    }

    const unit = details.cooldown_days === 1 ? 'day' : 'days';
    return `Try again in ${details.cooldown_days} ${unit}.`;
  }

  switch (details?.reason) {
    case 'already_connected':
      return 'You are already friends.';
    case 'pending_incoming':
      return 'They already sent you a request. Review it in Requests.';
    case 'profile_not_found':
      return 'This account is no longer available.';
    case 'request_not_found':
    case 'already_handled':
      return 'This request has already been handled.';
    case 'forbidden_transition':
      return 'This request can no longer be changed.';
    default:
      return error.message || fallback;
  }
}
