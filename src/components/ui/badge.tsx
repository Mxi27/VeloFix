import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 w-fit transition-colors [&>svg]:size-3 [&>svg]:pointer-events-none overflow-hidden",
  {
    variants: {
      variant: {
        default:     "bg-primary/15 text-primary",
        secondary:   "bg-muted text-muted-foreground",
        destructive: "bg-destructive/15 text-destructive",
        outline:     "border-border text-foreground bg-transparent",
        ghost:       "bg-transparent text-muted-foreground hover:bg-muted",
        link:        "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

function Badge({
  className,
  variant = "secondary",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
