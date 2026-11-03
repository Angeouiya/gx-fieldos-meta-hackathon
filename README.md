# GX FieldOS: from field observations to an action plan

**Open-source Web core for the Meta AI Developer Hackathon.** This Web-only copy has
no upstream Git history, production database, local secrets, personal screen
captures or desktop binaries. See the [MIT licence](LICENSE) and
[source scope](SOURCE_SCOPE.md).
Its production interface is [agrix.africa/gx](https://agrix.africa/gx).

GX organizes a parcel into dated scan folders with up to four images each.
The user can compare observations across a project, review an AI-assisted plan,
track work and create campaign documents. Meta Model API is called from server
routes, never directly from the browser. GX records what images show separately
from estimates and checks that still require local measurement.

## Run a local Web demonstration

Requirements: Node.js 24 or later and Corepack with pnpm 12.6.0. Clone this
repository, then create `apps/web/.env.local` with the following values:

```dotenv
GX_FIELD_DEMO_MODE=true
GX_FIELD_DEMO_REPLAY=true
```

Then run:

```sh
corepack pnpm install
corepack pnpm dev:web
```

Open `http://127.0.0.1:3000/#projects`. The local demo saves its state under
`apps/web/.gx-field-demo` and can accept five scan folders with four image
views each.
Replay mode uses **saved illustrative responses**; it does not make a new Meta
request or verify a real parcel. You can also test a live Meta call by setting
`GX_FIELD_DEMO_REPLAY=false`, `GX_MODEL_PROVIDER=meta` and `MODEL_API_KEY` in
the ignored local environment file. Never commit a model key. Use only synthetic
or otherwise authorized images during testing. An ordinary photo cannot measure
parcel area, soil chemistry or likely yields.

The local demo includes client-side business plan PDF/DOCX and Excel workbook
creation. Its complete technical-guide route and collaborator email invitations
depend on the separate AGRIX service and are **not reproduced by this clone**.
The production account, persistent scans, roles, private files and server
exports also depend on that service. The local replay is intentionally disabled
in production builds. No SAM segmentation is claimed.

## Code map

| Path | Responsibility |
| --- | --- |
| `packages/ui/src/pages/FieldOS.tsx` and `FieldOSParcelMap.tsx` | Project, parcel and scan interface. |
| `packages/ui/src/pages/FieldOSPlan.tsx` | Reviewable plan interface. |
| `packages/ui/src/pages/FieldOSFarm.tsx` | Follow-up, budget and local-replay business documents. |
| `apps/web/lib/field-demo.ts` | Local-only state, multi-view uploads and replay or live Meta scan requests. |
| `apps/web/lib/model-provider.ts` | Server-side Meta/OpenAI provider and model selection. |
| `apps/web/app/api/chat` and `apps/web/app/api/work` | Chat and multimodal work routes; model keys stay server-side. |
| `apps/web/lib/field-proxy.ts` | Restricted proxy to AGRIX projects, scans and exports in the connected deployment. |

The local Meta scan route requests JSON, parses it and normalizes fields before
display; the replay path returns saved illustrative findings. The production
AGRIX backend, including its database schema, is outside this candidate. See
[`docs/FIELDOS_HACKATHON.md`](docs/FIELDOS_HACKATHON.md) for development history
and the integration boundary.

## Verify the source

```sh
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build:web
```

The local demonstration and its test data are illustrative. A passing build
does not prove that the external AGRIX session, email and export services are
available. The twenty generated example images from the video are excluded.
