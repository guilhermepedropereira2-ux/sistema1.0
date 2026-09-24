import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-xs font-semibold tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px] cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0F19] font-bold border border-[#D4AF37]/50 shadow-none",
        gold:
          "bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0F19] font-bold border border-[#D4AF37]/50 shadow-none",
        destructive:
          "bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive/30 shadow-none",
        outline:
          "border border-white/10 bg-[#141724] text-slate-200 hover:text-white hover:border-[#D4AF37]/40 hover:bg-[#1A1E2C] shadow-none",
        secondary:
          "bg-[#181B28] text-slate-200 border border-white/5 hover:border-white/15 hover:bg-[#202434] shadow-none",
        ghost: "text-slate-300 hover:text-white hover:bg-white/[0.06]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[4px] px-3 text-xs",
        lg: "h-11 rounded-[4px] px-8 text-sm",
        icon: "h-9 w-9 rounded-[4px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
