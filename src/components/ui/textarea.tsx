import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground focus-visible:bg-black/60 aria-invalid:bg-destructive/10 flex field-sizing-content min-h-16 w-full rounded-none bg-black/60 px-[10px] py-[6px] text-base shadow-none transition-[background-color,color,border-color] disabled:cursor-not-allowed disabled:opacity-50 md:text-xs",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
