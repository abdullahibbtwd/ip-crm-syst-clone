import { cva } from "class-variance-authority";

/** Shared focus ring for interactive controls */
export const focusRing =
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Base field surface - inputs, selects, textareas */
export const fieldVariants = cva(
  [
    "w-full min-w-0 rounded-md border bg-card text-sm text-foreground shadow-xs",
    "transition-[color,box-shadow,border-color] duration-150",
    "placeholder:text-muted-foreground/70",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
    focusRing,
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-[13px]",
        default: "h-9 px-3",
        lg: "h-10 px-3.5 text-base md:text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);
