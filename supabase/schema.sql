-- taskgo schema
-- Run this in Supabase SQL Editor if tables are not yet created

CREATE SCHEMA IF NOT EXISTS taskgo;

-- Tasks table
CREATE TABLE IF NOT EXISTS taskgo.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('core_value', 'roadmap', 'spec_design', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  is_focus BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Design layers table
CREATE TABLE IF NOT EXISTS taskgo.design_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('core_value', 'roadmap', 'spec_design')),
  title TEXT NOT NULL,
  content TEXT,
  cover_until DATE,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI suggestions table
CREATE TABLE IF NOT EXISTS taskgo.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES taskgo.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('first_step', 'research')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON taskgo.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_is_focus_idx ON taskgo.tasks(is_focus) WHERE is_focus = true;
CREATE INDEX IF NOT EXISTS design_layers_user_layer_idx ON taskgo.design_layers(user_id, layer_type);
CREATE INDEX IF NOT EXISTS ai_suggestions_task_id_idx ON taskgo.ai_suggestions(task_id);

-- RLS
ALTER TABLE taskgo.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE taskgo.design_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE taskgo.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own tasks"
  ON taskgo.tasks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own design_layers"
  ON taskgo.design_layers FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ai_suggestions"
  ON taskgo.ai_suggestions FOR ALL
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION taskgo.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON taskgo.tasks
  FOR EACH ROW EXECUTE FUNCTION taskgo.update_updated_at();
