import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-9 w-full min-w-0 rounded-none border-0 bg-black/40 px-3 py-1 text-base shadow-none transition-[background-color,color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs",
        "focus-visible:bg-black/60 focus-visible:ring-0",
        "aria-invalid:bg-destructive/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
