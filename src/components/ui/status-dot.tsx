import { cn } from '@/lib/utils'

type StatusVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue'

const colorMap: Record<StatusVariant, string> = {
  green: '#30A46C',
  yellow: '#F5A623',
  red: '#E5484D',
  gray: '#6B6B6B',
  blue: '#5E6AD2',
}

interface StatusDotProps {
  variant: StatusVariant
  label?: string
  className?: string
}

export function StatusDot({ variant, label, className }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: colorMap[variant] }}
      />
      {label && (
        <span className="text-xs" style={{ color: '#6B6B6B' }}>
          {label}
        </span>
      )}
    </span>
  )
}

export { colorMap as statusColors }
