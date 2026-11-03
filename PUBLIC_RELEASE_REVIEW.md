# Public release review

This folder is a **private candidate**, not yet an open-source release. It was
exported from the GX Web source at commit `07f1a7a` into a fresh directory,
without Git history. The AGRIX backend repository and its tracked production
database are deliberately absent. The personal screenshot in `docs/captures`
and the desktop icon bundle are absent too.

## Owner decisions before publishing

1. Confirm ownership of the GX code and choose an open-source licence. MIT is a
   possible permissive choice, but it has **not** been approved or applied.
   The project needs an actual `LICENSE` file before it is called open source.
2. Confirm that the GX brand mark in `apps/web/public/icon.svg` can be shared.
   A code licence does not automatically grant trademark rights.
3. Review the licence and provenance of `scripts/fixtures/synthetic-field.png`.
   It is a synthetic test image; its exact generation prompt and model were not
   retained. The twenty larger AI-generated demonstration images are **not**
   included because their redistribution rights have not been approved.
4. Review dependency notices before redistributing bundled binaries. Source
   packages include components with Apache/LGPL, MPL, CC-BY and dual MIT/GPL
   declarations. Recheck resolved dependency versions and their notice files.
5. Run secret and personal-data scans on the exact final commit and verify a
   fresh clone. The absence of obvious key prefixes is not a full security
   audit.
6. Decide how much of the AGRIX server can be published in a later, separately
   sanitized repository. This Web source cannot reproduce production accounts,
   persistent scans, invitation email or all document exports by itself.

## Candidate verification

Record command results, date, commit hash and any limitations here after the
fresh Web-only build. Do not use the private AGRIX repository or its database
as part of a public source bundle.
