import { cn } from "@/lib/utils";

type StatusVariant = "green" | "yellow" | "red" | "gray" | "blue";

const dotClass: Record<StatusVariant, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
  gray: "bg-[color:var(--color-text-subtle)]",
  blue: "bg-primary",
};

interface StatusDotProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusDot({ variant, label, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block rounded-full flex-shrink-0",
          dotClass[variant],
        )}
        style={{ width: 6, height: 6 }}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </span>
  );
}

export { dotClass as statusDotClass };
