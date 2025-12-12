import * as React from "react"
import { VisuallyHidden as RadixVisuallyHidden } from "@radix-ui/react-visually-hidden"

const VisuallyHidden = React.forwardRef<
  React.ElementRef<typeof RadixVisuallyHidden>,
  React.ComponentPropsWithoutRef<typeof RadixVisuallyHidden>
>(({ children, ...props }, ref) => (
  <RadixVisuallyHidden ref={ref} {...props}>
    {children}
  </RadixVisuallyHidden>
))

VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }

