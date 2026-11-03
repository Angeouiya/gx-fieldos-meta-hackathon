# GX FieldOS architecture

## Connected production flow

The signed-in GX interface at [agrix.africa/gx](https://agrix.africa/gx)
records projects, parcel measurements, scan folders, evidence views, plan
versions, farm operations and exports through the separate AGRIX service. This
repository contains the GX Web client and its restricted proxy, not the AGRIX
server or database. The proxy forwards only allowlisted project and field
routes and uses the AGRIX session; credentials stay server-side.

```text
Browser / GX Web UI
  -> GX FieldOS proxy and Meta Model API routes
  -> AGRIX project API (private service)
  -> AGRIX database, file storage and email service
```

Each scan folder can hold up to four views of one aspect. The UI associates
views, user notes and captured location context with a project. Meta analysis
is requested on the server, parsed into structured findings, and shown for
review. A project plan can combine multiple analyzed folders. The parcel area
uses a declared value or a mapped/GPS boundary with a stated method; an image
alone is not treated as a survey or soil test.

## Reproducible local path

`apps/web/lib/field-demo.ts` supplies a development-only local state store and
scan API. With `GX_FIELD_DEMO_MODE=true` and `GX_FIELD_DEMO_REPLAY=true`, a
reviewer can create five folders of four images and inspect a saved example
analysis without an account or API key. Set `GX_FIELD_DEMO_REPLAY=false`,
`GX_MODEL_PROVIDER=meta` and `MODEL_API_KEY` in an ignored local env file to
exercise a real Meta request. The same UI can create a draft plan, record farm
operations, generate English PDF/DOCX business documents and an Excel workbook
on the client, and download a locally assembled technical guide in English or
French. Replay output and illustrative figures are not live
agronomic or market evidence.

The local path does not include cloud accounts, email invitations, the full
production guide with verified local sources or the AGRIX database. Its replay route rejects
production deployments. The public code can therefore demonstrate the GX
Web/Meta implementation while the production service remains separately
operated. No SAM 3.1 integration is claimed.

## Code landmarks

- `packages/ui/src/pages/FieldOS.tsx`: projects, scans, evidence and documents.
- `packages/ui/src/pages/FieldOSParcelMap.tsx`: declared and boundary areas.
- `packages/ui/src/pages/FieldOSPlan.tsx`: plan review.
- `packages/ui/src/pages/FieldOSFarm.tsx`: farm operations and local exports.
- `apps/web/lib/field-demo.ts`: development-only API and Meta/replay path.
- `apps/web/lib/field-demo-guide.ts`: local technical guide assembled from saved project evidence.
- `apps/web/lib/model-provider.ts`: model configuration and server requests.
- `apps/web/lib/field-proxy.ts`: restricted AGRIX forwarding.

See [SOURCE_SCOPE.md](../SOURCE_SCOPE.md) for release and test limits.
