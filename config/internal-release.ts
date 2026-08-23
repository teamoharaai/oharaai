export interface InternalReleaseSection {
  heading: string;
  updates: string[];
}

export interface InternalReleaseNotes {
  id: string;
  version: string;
  title: string;
  summary: string;
  sections: InternalReleaseSection[];
}

// Temporary internal-release switch. Set to false before the public launch to
// disable the login update without touching auth or route code.
export const SHOW_INTERNAL_RELEASE_NOTES = true;

export const INTERNAL_RELEASE_NOTES: InternalReleaseNotes = {
  id: 'momentum-v1-1-internal-release',
  version: 'OHARA Momentum Version 1.1',
  title: "What's new in OHARA",
  summary: 'Live current-week Momentum with persistent history, alongside the completed Notes Version 1.0 release.',
  sections: [
    {
      heading: 'OHARA Notes Version 1.0',
      updates: [
        'Reliable formatting, visible lists and checklists, alignment, links, and private images.',
        'Link specific passages or checklist items directly to your Goals.',
        'Reference selected text with OHARA Intelligence for focused future analysis.',
        'Improved Goal and Intelligence reference navigation, settings, and removal controls.',
      ],
    },
    {
      heading: 'Momentum Version 1.0 Beta',
      updates: [
        'Goal Momentum and OHARA Momentum now use the new authoritative 0–100 scoring architecture.',
      ],
    },
    {
      heading: 'Momentum Version 1.1',
      updates: [
        'Momentum now responds to progress made during the current week.',
        'Completed milestones, actions, and reflections can update Momentum without waiting for the week to close.',
        'Inactive weeks preserve your existing Momentum instead of making the score disappear.',
      ],
    },
  ],
};
