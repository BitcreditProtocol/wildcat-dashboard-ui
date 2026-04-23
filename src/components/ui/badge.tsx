import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm [a&]:hover:bg-[var(--color-primary)]/90",
        secondary:
          "border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] [a&]:hover:bg-[var(--color-secondary)]/90",
        destructive:
          "border-transparent bg-[var(--color-signal-error)] text-white shadow-sm [a&]:hover:bg-[var(--color-signal-error)]/90",
        success:
          "border-transparent bg-[var(--color-signal-success)] text-white shadow-sm [a&]:hover:bg-[var(--color-signal-success)]/90",
        pending:
          "border-transparent bg-yellow-500 text-white shadow-sm [a&]:hover:bg-yellow-600 dark:bg-yellow-600 dark:[a&]:hover:bg-yellow-500",
        processing:
          "border-transparent bg-[var(--color-signal-alert)] text-white shadow-sm [a&]:hover:bg-[var(--color-signal-alert)]/90",
        info: "border-transparent bg-blue-500 text-white shadow-sm [a&]:hover:bg-blue-600 dark:bg-blue-600 dark:[a&]:hover:bg-blue-500",
        loading:
          "border-transparent bg-gray-500 text-white shadow-sm [a&]:hover:bg-gray-600 dark:bg-gray-600 dark:[a&]:hover:bg-gray-500",
        neutral:
          "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] border border-[var(--color-border)] [a&]:hover:bg-[var(--color-secondary)]/80",
        outline:
          "text-[var(--color-foreground)] [a&]:hover:bg-[var(--color-accent)] [a&]:hover:text-[var(--color-accent-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
