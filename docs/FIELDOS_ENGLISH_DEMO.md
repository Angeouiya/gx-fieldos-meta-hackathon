# GX FieldOS English demo

The FieldOS project, scan, decision, follow-up and campaign screens use English interface copy for the Meta AI demo. New scan analyses and project plans default to English. Existing scan evidence, project data, permissions and API payloads are unchanged.

The campaign screen translates fixed validation gaps and scenario names returned by AGRIX, while retaining the original values for calculations and exports. The linked AGRIX parcel map can be opened with `?lang=en` for English map controls.

Verification: `corepack pnpm --filter @gx/ui typecheck`, focused FieldOS and GXApp UI tests, `corepack pnpm lint`, and `corepack pnpm build:web`.
