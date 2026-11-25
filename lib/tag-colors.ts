import type { CSSProperties } from "react";

export const TAG_COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#78716c", // stone
] as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isValidTagColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

/** Black or white, whichever reads better on top of the given color. */
export function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}

/**
 * Inline style for a colored tag badge. "solid" fills the badge (selected/assigned tags),
 * "soft" only tints it (unselected tags in the filter bar).
 */
export function tagBadgeStyle(color: string | undefined, variant: "solid" | "soft"): CSSProperties | undefined {
  if (!color) return undefined;
  if (variant === "solid") {
    return { backgroundColor: color, borderColor: color, color: readableTextColor(color) };
  }
  return { backgroundColor: `${color}1f`, borderColor: color, color: "inherit" };
}
