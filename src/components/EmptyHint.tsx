import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Friendly placeholder used inside cards when the user has no data yet.
 * Explains what the feature does and (optionally) links to the next step.
 */
export function EmptyHint({
  title,
  description,
  actionLabel,
  actionTo,
  icon,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center text-center gap-2 px-4 py-6",
        className,
      )}
    >
      {icon && <div className="text-champagne/70 mb-1">{icon}</div>}
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="text-xs text-soft max-w-[34ch] leading-relaxed">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-2 inline-flex items-center rounded-md border border-champagne/30 bg-champagne/10 px-3 py-1.5 text-xs font-medium text-champagne transition-colors hover:bg-champagne/20"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
