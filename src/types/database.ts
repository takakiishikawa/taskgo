export type LayerType = "core_value" | "roadmap" | "spec_design" | "other";
export type TaskStatus = "pending" | "in_progress" | "done";
export type SuggestionType = "first_step" | "research" | "issues";
export type RecurringTaskType = "issue_discovery_short" | "issue_discovery_mid";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  layer_type: LayerType;
  status: TaskStatus;
  is_focus: boolean;
  due_date: string | null;
  output_note: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DesignLayer {
  id: string;
  user_id: string;
  layer_type: "core_value" | "roadmap" | "spec_design";
  title: string;
  content: string | null;
  cover_until: string | null;
  last_updated_at: string;
  created_at: string;
}

export interface AiSuggestion {
  id: string;
  task_id: string;
  user_id: string;
  suggestion_type: SuggestionType;
  content: string;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}

export interface WeeklyFocus {
  id: string;
  user_id: string;
  week_start: string;
  created_at: string;
}

export interface WeeklyFocusTask {
  id: string;
  weekly_focus_id: string;
  task_id: string;
  is_done: boolean;
  created_at: string;
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;
  summary: string;
  generated_at: string;
}

export interface RecurringTask {
  id: string;
  user_id: string;
  task_type: RecurringTaskType;
  next_generate_at: string;
  created_at: string;
}
