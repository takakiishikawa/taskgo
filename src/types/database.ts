export type LayerType = 'core_value' | 'roadmap' | 'spec_design' | 'other'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type SuggestionType = 'first_step' | 'research'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  layer_type: LayerType
  status: TaskStatus
  is_focus: boolean
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface DesignLayer {
  id: string
  user_id: string
  layer_type: 'core_value' | 'roadmap' | 'spec_design'
  title: string
  content: string | null
  cover_until: string | null
  last_updated_at: string
  created_at: string
}

export interface AiSuggestion {
  id: string
  task_id: string
  user_id: string
  suggestion_type: SuggestionType
  content: string
  created_at: string
}
