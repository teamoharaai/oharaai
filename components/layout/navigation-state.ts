export function isActiveRoute(pathname: string, matches: readonly string[]): boolean {
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}
