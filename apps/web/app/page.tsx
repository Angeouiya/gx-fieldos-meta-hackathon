import { GXApp } from "@gx/ui";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <GXApp runtime="web" agrixMode={process.env.NODE_ENV === "production" || process.env.GX_AGRIX_SESSION_MODE === "true"}
    localFieldReplay={process.env.NODE_ENV !== "production" && process.env.GX_FIELD_DEMO_REPLAY === "true"} />;
}
