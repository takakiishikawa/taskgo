"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
  Button,
} from "@takaki/go-design-system";
import { CheckCircle2 } from "lucide-react";

interface OutputModalProps {
  open: boolean;
  taskTitle: string;
  onSave: (outputNote: string) => Promise<void>;
  onSkip: () => void;
}

export function OutputModal({
  open,
  taskTitle,
  onSave,
  onSkip,
}: OutputModalProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) {
      onSkip();
      return;
    }
    setSaving(true);
    try {
      await onSave(note.trim());
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setNote("");
    onSkip();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleSkip();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <DialogTitle className="text-sm">タスク完了</DialogTitle>
          </div>
        </DialogHeader>

        <div className="mt-1">
          <p className="text-sm text-muted-foreground mb-1 truncate">
            「{taskTitle}」
          </p>
          <p className="text-sm font-medium mb-4">
            このタスクで出したアウトプット・バリューを一言で記録しましょう
          </p>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例: ロードマップv2の骨子を決定、○○機能の仕様書を完成 など"
            className="text-sm resize-none mb-4"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
            }}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleSkip} disabled={saving}>
              スキップ
            </Button>
            <Button onClick={handleSave} disabled={saving || !note.trim()}>
              {saving ? "保存中..." : "記録する"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
