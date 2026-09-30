export function databaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown database error';
}

export function isEntryConflictError(error: unknown): boolean {
  return databaseErrorMessage(error).startsWith('Entry changed in another session');
}
