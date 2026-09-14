'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
    }

    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          className="sr-only peer"
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            'peer h-6 w-11 rounded-full bg-muted transition-colors',
            'peer-checked:bg-primary',
            'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50',
            'after:content after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:shadow-sm',
            'peer-checked:after:translate-x-full',
            className
          )}
        />
      </label>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }