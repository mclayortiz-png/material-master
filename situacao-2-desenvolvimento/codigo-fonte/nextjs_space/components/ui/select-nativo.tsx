import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectNativoProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  erro?: boolean
}

/** Select nativo estilizado — acessível, leve e confiável para selects em cascata. */
export const SelectNativo = React.forwardRef<HTMLSelectElement, SelectNativoProps>(({ className, erro, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full appearance-none rounded-md border bg-background px-3 pr-9 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        erro ? 'border-destructive' : 'border-input',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  </div>
))
SelectNativo.displayName = 'SelectNativo'
