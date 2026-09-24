import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-[4px] border border-white/10 bg-[#0E111A] px-3 py-2 text-sm text-white shadow-none placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-[#D4AF37]/60 focus-visible:ring-1 focus-visible:ring-[#D4AF37]/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
