/**
 * Brand color tokens - use for inline styles, charts, or non-Tailwind contexts.
 * Prefer Tailwind classes (bg-brand-light, text-brand-green, etc.) when possible.
 */
export const colors = {
  brandLight: "#f4f6f3",
  brandGreen: "#1a3c34",
  brandOrange: "#e8621a",
  white: "#ffffff",
} as const;

export type BrandColor = keyof typeof colors;
