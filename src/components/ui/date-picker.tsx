"use client";

import { DatePicker as GdsDatePicker } from "@takaki/go-design-system";
import { toYMD } from "@/lib/date";

interface DatePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "期日を選択",
  className,
}: DatePickerProps) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  const handleChange = (date: Date | undefined) => {
    onChange(date ? toYMD(date) : undefined);
  };

  return (
    <GdsDatePicker
      value={selected}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
