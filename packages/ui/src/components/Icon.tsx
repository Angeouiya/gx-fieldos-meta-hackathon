import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "animal"
  | "archive"
  | "arrow-up"
  | "camera"
  | "briefcase"
  | "building"
  | "checklist"
  | "chevron-left"
  | "chevron-right"
  | "clipboard"
  | "clock"
  | "close"
  | "external"
  | "factory"
  | "grid"
  | "map"
  | "menu"
  | "message"
  | "mic"
  | "paperclip"
  | "package"
  | "pencil"
  | "pin"
  | "plus"
  | "settings"
  | "shield"
  | "sprout"
  | "sun"
  | "trash"
  | "users"
  | "utensils";

const paths: Record<IconName, ReactNode> = {
  animal: <><path d="M5 8c-2-1-3 0-3 2v4l3 2 2-2h9l2 2 2-2v-4c0-2-1-3-3-2" /><path d="M7 8c0-3 2-5 5-5s5 2 5 5M8 14v6M16 14v6M9 8h.01M15 8h.01" /></>,
  archive: <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v12h14V8M10 12h4" /></>,
  "arrow-up": (
    <>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </>
  ),
  camera: <><path d="M3 7h4l2-3h6l2 3h4v12H3V7Z" /><circle cx="12" cy="13" r="3.5" /></>,
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M9 21v-5h6v5" />
    </>
  ),
  checklist: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 9 1.5 1.5L12 8M14 9h3M8 16h9" /></>,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  clipboard: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M9 5V3h6v2M8 11h8M8 15h8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" /></>,
  factory: <><path d="M3 20V9l6 4V9l6 4V5l6 3v12H3Z" /><path d="M7 16h1M12 16h1M17 16h1" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  message: <><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 20l.9-4.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 11.5 3 8.5 8.5 0 0 1 20 11.5Z" /><path d="M7 11h9M7 14h6" /></>,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
  paperclip: <path d="m20 11.5-8.5 8.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8.5-8.5" />,
  package: <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7ZM3 7l9 4 9-4M12 11v10" /><path d="m7.5 5 9 4" /></>,
  pencil: <><path d="m4 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" /><path d="m14.5 7.5 3 3" /></>,
  pin: <><path d="m8 4 8 0-1 6 3 3v2H6v-2l3-3-1-6ZM12 15v6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06-2.12 2.12-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.64V20.5h-3v-.1a1.8 1.8 0 0 0-1.1-1.64 1.8 1.8 0 0 0-2 .36l-.06.06-2.12-2.12.06-.06a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 5 13.9H5v-3h.1A1.8 1.8 0 0 0 6.74 9.8a1.8 1.8 0 0 0-.36-2l-.06-.06 2.12-2.12.06.06a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 11.6 4.4V4.3h3v.1a1.8 1.8 0 0 0 1.1 1.64 1.8 1.8 0 0 0 2-.36l.06-.06 2.12 2.12-.06.06a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.64 1.1h.1v3h-.1A1.8 1.8 0 0 0 19.4 15Z" />
    </>
  ),
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  sprout: <><path d="M12 21v-9M12 15c-5 0-8-3-8-8 5 0 8 3 8 8ZM12 12c0-5 3-8 8-8 0 5-3 8-8 8Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2H3ZM17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1h-3" /></>,
  utensils: <><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 21V3c-3 2-4 5-4 9h4" /></>,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
