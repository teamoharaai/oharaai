# Constellation renderer preview

This Expo Router app root exists only for internal development and screenshot QA.
It is outside the production `app/` route tree and is the only browser route that
imports the renderer fixture.

Run:

```sh
npm run preview:constellation
```

Use `/` for concept 1a's light treatment and `/?appearance=dark` for concept 1b's
dark treatment. Node selection is functional; pan, zoom, filters, Timeline,
Archive, and draft-link controls are intentionally absent.
