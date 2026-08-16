# PARC MLA Weekly Report

Source repository for the existing PARC MLA weekly dashboard at:

https://parc-mla-weekly-report.netlify.app

## Deployment

- Netlify publishes `site/`.
- The server function is in `netlify/functions/data.mjs`.
- Production reads the public, aggregate-only Apps Script feed through the Netlify environment variable `MLA_SHEET_FEED_URL`.
- If the live feed is unavailable, the function falls back to `site/data/snapshot.json`.

The browser assets in the initial Git commit were recovered from immutable production deploy `6a704695a54baec1996aab39` and verified against the production SHA-1 manifest before commit. No raw reviewer identity, private evidence URL, or Google credential is stored in this repository.

## Data guardrails

- Approval and curation are not the same as evidence verification.
- Candidate and pending signals must remain labeled as such.
- Review samples are not customer prevalence.
- Locale Insight is contextual prior only; it is not official population, eligibility, boundary, risk, or observed behavior evidence.
