import type { LayerType, TaskStatus } from "@/types/database";

export const LAYER_LABELS: Record<LayerType, string> = {
  core_value: "コアバリュー",
  roadmap: "ロードマップ",
  spec_design: "仕様・デザイン",
  other: "その他",
};

export const LAYER_ORDER: LayerType[] = [
  "core_value",
  "roadmap",
  "spec_design",
  "other",
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "未着手",
  in_progress: "進行中",
  done: "完了",
};

export const STATUS_DOT: Record<TaskStatus, "gray" | "blue" | "green"> = {
  pending: "gray",
  in_progress: "blue",
  done: "green",
};
