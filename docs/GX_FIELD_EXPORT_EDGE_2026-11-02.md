# GX FieldOS export download path — 2026-11-02

During the Meta walkthrough, Edge blocked top-level navigation to the GX
technical-guide and campaign export API URLs with `ERR_BLOCKED_BY_CLIENT`.
The same project exported its PDF, DOCX and XLSX files in the Codex browser.
This evidence does not identify which Edge component blocked navigation.

GX now requests these files with a same-origin, authenticated `fetch` and
starts a named Blob download from the project page. A non-success response,
HTML/JSON response, empty file or file over 50 MiB produces a visible error
instead of navigating away or downloading an error page. Business-plan
buttons stay disabled until an owner-approved plan in the interface language
exists; the technical guide and Excel tracker remain available for a draft.
If new project data moves an approved plan to `review_needed`, GX checks its
recorded `approvedAt` before keeping the business export active. It labels the
budget `review needed` rather than presenting the earlier approval as current.

Focused verification: `@gx/ui` typecheck and 16 FieldOS/FieldOSFarm tests
passed after this change. Production Edge behavior must be
checked after deployment before presenting exports as working there.
