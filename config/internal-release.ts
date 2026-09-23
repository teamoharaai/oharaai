export interface FeaturePatchNote {
  id: string;
  category: string;
  version: string;
  title: string;
  summary: string;
  releasedAt: string;
}

// Temporary internal-release switch. Set to false before the public launch to
// disable the login update without touching auth or route code.
export const SHOW_INTERNAL_RELEASE_NOTES = true;

export const INTERNAL_RELEASE_NOTES: readonly FeaturePatchNote[] = [
  {
    id: 'goals-v2-3-1',
    category: 'Goals',
    version: '2.3.1',
    title: 'Clearer Goal controls',
    summary: 'Goal identity, timing, configuration, and workspace actions now have a clearer hierarchy.',
    releasedAt: '2026-09-23T12:00:00.000Z',
  },
  {
    id: 'vault-v2-3',
    category: 'Vault',
    version: '2.3',
    title: 'Vault is now a full workspace',
    summary: 'Sticky Notes, Notes, Reflections, and Sources now have more room and clearer organization.',
    releasedAt: '2026-09-23T13:01:19.000Z',
  },
  {
    id: 'notes-v1-1',
    category: 'Notes',
    version: '1.1',
    title: 'Notes interaction and export polish',
    summary: 'References, selection, editor clarity, and formatted PDF exports were improved.',
    releasedAt: '2026-09-09T17:46:11.000Z',
  },
  {
    id: 'momentum-v1-1',
    category: 'Momentum',
    version: '1.1',
    title: 'Live provisional Momentum',
    summary: 'Current-week movement is visible while closed weekly snapshots remain immutable.',
    releasedAt: '2026-08-23T04:02:12.000Z',
  },
];
