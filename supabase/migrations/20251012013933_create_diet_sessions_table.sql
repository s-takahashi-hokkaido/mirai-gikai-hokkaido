-- Create diet_sessions table
CREATE TABLE diet_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- ID
  name text NOT NULL, -- 会期名
  start_date date NOT NULL, -- 開始日
  end_date date NOT NULL, -- 終了日
  created_at timestamptz NOT NULL DEFAULT now(), -- 作成日時
  updated_at timestamptz NOT NULL DEFAULT now(), -- 更新日時
  CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date)
);

-- Enable Row Level Security
ALTER TABLE diet_sessions ENABLE ROW LEVEL SECURITY;

-- Create index for date range queries
CREATE INDEX idx_diet_sessions_date_range ON diet_sessions (start_date, end_date);

-- Auto-update updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON diet_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE diet_sessions IS '国会会期マスタテーブル';
COMMENT ON COLUMN diet_sessions.id IS 'ID';
COMMENT ON COLUMN diet_sessions.name IS '会期名';
COMMENT ON COLUMN diet_sessions.start_date IS '開始日';
COMMENT ON COLUMN diet_sessions.end_date IS '終了日';
COMMENT ON COLUMN diet_sessions.created_at IS '作成日時';
COMMENT ON COLUMN diet_sessions.updated_at IS '更新日時';
