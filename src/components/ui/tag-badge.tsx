import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@takaki/go-design-system";

/** タグ名の文字列ハッシュから一意のカラーペアを生成 */
export function getTagColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const palette = [
    { bg: "rgba(94,106,210,0.15)", text: "var(--color-primary)" },
    { bg: "rgba(48,164,108,0.15)", text: "var(--color-success)" },
    { bg: "rgba(245,166,35,0.15)", text: "var(--color-warning)" },
    { bg: "rgba(20,184,166,0.15)", text: "var(--color-info)" },
    { bg: "rgba(168,85,247,0.15)", text: "var(--color-purple)" },
    { bg: "rgba(249,115,22,0.15)", text: "var(--color-orange)" },
    { bg: "rgba(236,72,153,0.15)", text: "var(--color-pink)" },
    { bg: "rgba(14,165,233,0.15)", text: "var(--color-blue)" },
  ];
  return palette[Math.abs(hash) % palette.length];
}

interface TagBadgeProps {
  name: string;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "xs";
}

export function TagBadge({
  name,
  onRemove,
  className,
  size = "xs",
}: TagBadgeProps) {
  const { bg, text } = getTagColor(name);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "xs" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
        className,
      )}
      style={{ background: bg, color: text }}
    >
      {name}
      {onRemove && (
        <Button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-2.5 h-2.5" />
        </Button>
      )}
    </span>
  );
}