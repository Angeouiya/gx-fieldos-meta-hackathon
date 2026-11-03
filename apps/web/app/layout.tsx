import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@gx/ui/styles.css";

export const metadata: Metadata = {
  title: "GX.ai",
  description: "L’espace de travail fondateur de GX.ai.",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#fbfcfa",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
