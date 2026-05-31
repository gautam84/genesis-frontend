import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] dark:ring-offset-slate-950",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:text-white shadow-md hover:shadow-[var(--shadow-primary)] hover:shadow-lg",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 hover:text-white shadow-md hover:shadow-lg dark:bg-red-600 dark:hover:bg-red-700 dark:hover:text-white",
        outline: "border-2 border-[var(--border)] bg-white text-slate-900 hover:bg-[var(--surface)] hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
        secondary:
          "bg-[var(--surface-dark)] text-slate-900 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-700 dark:text-slate-50 dark:hover:bg-slate-600 dark:hover:text-slate-50",
        ghost: "bg-white text-slate-900 hover:bg-[var(--primary)] hover:text-white dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
        link: "text-[var(--primary)] underline-offset-4 hover:underline hover:text-[var(--primary-dark)]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-13 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
