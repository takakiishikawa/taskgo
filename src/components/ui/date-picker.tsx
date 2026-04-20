'use client'

import { DatePicker as GdsDatePicker } from '@takaki/go-design-system'

interface DatePickerProps {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = '期日を選択', className }: DatePickerProps) {
  const selected = value ? new Date(value + 'T00:00:00') : undefined

  const handleChange = (date: Date | undefined) => {
    if (date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      onChange(`${y}-${m}-${d}`)
    } else {
      onChange(undefined)
    }
  }

  return (
    <GdsDatePicker
      value={selected}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  )
}
