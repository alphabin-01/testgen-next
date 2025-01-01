import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    className={cn(
      "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = "Input"
export { Input }