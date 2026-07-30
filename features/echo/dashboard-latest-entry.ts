export const DASHBOARD_ENTRY_PREVIEW_MAX_LENGTH = 280;

export type DashboardLatestEntrySummary = {
  id: string;
  preview: string;
  createdAt: Date;
};

export type DashboardLatestEntryRow = {
  id: string;
  plain_text: string;
  updated_at: string;
};

type DashboardLatestEntryResult = {
  data: DashboardLatestEntryRow | null;
  error: unknown | null;
};

function createBoundedPreview(content: string): string {
  if (content.length <= DASHBOARD_ENTRY_PREVIEW_MAX_LENGTH) return content;
  return `${content.slice(0, DASHBOARD_ENTRY_PREVIEW_MAX_LENGTH).trimEnd()}…`;
}

export function resolveDashboardLatestEntryResult(
  result: DashboardLatestEntryResult,
): DashboardLatestEntrySummary | null {
  if (result.error) {
    throw new Error('Unable to load the latest entry summary');
  }
  if (!result.data) return null;

  return {
    id: result.data.id,
    preview: createBoundedPreview(result.data.plain_text),
    createdAt: new Date(result.data.updated_at),
  };
}
