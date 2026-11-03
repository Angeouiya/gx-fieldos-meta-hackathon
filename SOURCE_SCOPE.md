# Source scope and verification

This repository contains the GX FieldOS Web client, Meta Model API integration,
and a local field demo. It was exported from the private GX repository at
`07f1a7a` into a fresh Git history. The private AGRIX service, its database,
production credentials, user records, marketplace and payment code are not
included.

The local demo supports scan folders with up to four images, replayed example
responses or a live Meta call with a user-provided key, reviewable plans, farm
records and client-side business plan PDF/DOCX and Excel exports. It does not
reproduce AGRIX accounts, persistent cloud storage, collaborator invitation
email, or the complete production technical guide. Replay is disabled in
production builds. The [AGRIX GX Web app](https://agrix.africa/gx) uses those
separate services when signed in.

The twenty generated example images used in the submission video are excluded
from this repository. The small schematic PNG under `scripts/fixtures` is a
synthetic input for the opt-in live API smoke test and is not field evidence.
No parcel area, soil chemistry, yield or return is established by an image.

## Verification on 3 November 2026

- Frozen-lockfile dependency installation passed.
- Direct Web TypeScript check and ESLint passed.
- 13 access/proxy tests, 18 FieldOS UI, farm and workbook tests, and 22
  provider/chat/work route tests passed after the security update.
- Next.js `16.4.4` production Web build passed after the security update.
- The production-dependency audit of the original source found two critical,
  six high and six moderate advisories. The security update pins Next.js
  `16.4.4` and resolves OpenAI's optional `undici` and `zod` peers to `8.12.2`
  and `4.6.6`. The refreshed lockfile audit reports **zero critical and zero
  high** advisories. Two moderate ExcelJS transitive advisories remain:
  `GHSA-w5hq-g745-h8pq` (`uuid@8.3.2`) and `GHSA-g3hv-75wg-m249`
  (`minimatch@3.1.5`/`5.1.9`). Their patched versions are major upgrades
  outside ExcelJS's declared dependency ranges; they were not forced without
  compatibility evidence.
- On the original long Windows workspace path, the pnpm task runner failed to
  write its own task state before invoking TypeScript. Direct TypeScript checks
  passed. The full test suite was not run for this isolated release.
- A targeted scan found no tracked database, local environment file, personal
  screen capture, desktop bundle, common provider-key prefix or known personal
  email address. This is not a guarantee against every undiscovered secret.

The MIT licence covers this repository's code. GX and AGRIX names and logos
identify the project; the licence does not grant trademark rights. Installed
third-party packages retain their own licences and notices, including packages
with LGPL, MPL and CC-BY declarations. No dependency binaries are committed.
