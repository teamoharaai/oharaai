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
  id: 'notes-v1-1-internal-release',
  version: 'OHARA Notes Version 1.1',
  title: "What's new in OHARA",
  summary: 'A focused interaction, reference, and document-export polish release.',
  sections: [
    {
      heading: 'Notes Version 1.1',
      updates: [
        'More reliable navigation between OHARA references and their source text.',
        'Faster reference creation while OHARA Intelligence is open.',
        'Cleaner document selection behavior.',
        'Improved editor icon clarity.',
        "PDF exports now preserve the document's formatting and images.",
      ],
    },
  ],
};
