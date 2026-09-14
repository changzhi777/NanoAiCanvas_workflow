import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("Tabs components must be used within Tabs")
  return ctx
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value = "", onValueChange, children, className, ...props }, ref) => {
    return (
      <TabsContext.Provider value={{ value, onValueChange: onValueChange || (() => {}) }}>
        <div ref={ref} className={cn("flex flex-col h-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} role="tablist" className={cn("flex items-center", className)} {...props}>
        {children}
      </div>
    )
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children: React.ReactNode
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, children, className, ...props }, ref) => {
    const ctx = useTabsContext()
    const isActive = ctx.value === value

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-active={isActive ? "" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors",
          isActive && "bg-white/10 text-foreground",
          !isActive && "text-muted-foreground hover:text-foreground",
          className
        )}
        onClick={() => ctx.onValueChange(value)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, className, ...props }, ref) => {
    const ctx = useTabsContext()
    if (ctx.value !== value) return null

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn("mt-2", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }