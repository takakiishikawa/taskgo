'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = '期日を選択', className }: DatePickerProps) {
  const selected = value ? new Date(value + 'T00:00:00') : undefined

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      onChange(`${y}-${m}-${d}`)
    } else {
      onChange(undefined)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-2 text-xs px-3 py-2 rounded border w-full text-left transition-colors',
          'bg-input border-border hover:border-ring/60 focus:outline-none focus:border-primary',
          !value ? 'text-muted-foreground' : 'text-foreground',
          className
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="flex-1">
          {selected
            ? format(selected, 'yyyy年M月d日', { locale: ja })
            : placeholder}
        </span>
        {value && (
          <span
            role="button"
            onClick={handleClear}
            className="w-3 h-3 flex-shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-popover border-border shadow-lg"
        align="start"
        sideOffset={4}
      >
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={ja}
          showOutsideDays
          classNames={{
            root: 'p-3',
            months: 'flex flex-col',
            month: 'space-y-3',
            month_caption: 'flex justify-center items-center h-7 relative',
            caption_label: 'text-xs font-medium text-foreground',
            nav: 'flex items-center gap-1',
            button_previous: 'absolute left-1 h-7 w-7 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            button_next: 'absolute right-1 h-7 w-7 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            month_grid: 'w-full border-collapse',
            weekdays: 'flex',
            weekday: 'text-muted-foreground text-xs w-9 h-7 flex items-center justify-center',
            week: 'flex w-full mt-1',
            day: 'h-9 w-9 text-center text-xs p-0 relative',
            day_button: 'h-9 w-9 rounded flex items-center justify-center text-xs transition-colors text-foreground hover:bg-accent',
            selected: '[&>button]:!bg-primary [&>button]:!text-primary-foreground',
            today: '[&>button]:font-bold [&>button]:text-primary',
            outside: '[&>button]:text-muted-foreground/40',
            disabled: '[&>button]:text-muted-foreground/30 [&>button]:pointer-events-none',
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
