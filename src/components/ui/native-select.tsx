import * as React from "react"
import { ChevronDown } from "lucide-react"

import { controlClasses } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// A real <select>: keyboard, screen reader and mobile picker support for free.
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(controlClasses, "appearance-none pr-9", className)} {...props} />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
