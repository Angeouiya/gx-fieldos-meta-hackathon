import type { ReactNode } from "react";

interface PlaceholderProps {
  title: string;
  description: string;
  testId: string;
  footer?: ReactNode;
}

export function Placeholder({ title, description, testId, footer }: PlaceholderProps) {
  return (
    <section className="gx-placeholder" data-testid={testId}>
      <div>
        <span className="gx-placeholder-mark" aria-hidden="true">GX</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {footer}
      </div>
    </section>
  );
}
