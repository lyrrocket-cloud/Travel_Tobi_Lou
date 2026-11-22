import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground focus-visible:bg-black/60 aria-invalid:bg-destructive/10 flex field-sizing-content min-h-16 w-full rounded-none border-0 bg-black/60 px-3 py-2 text-base shadow-none transition-[background-color,color] outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
