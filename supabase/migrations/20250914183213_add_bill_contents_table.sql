-- Create ENUM type for difficulty levels
CREATE TYPE difficulty_level_enum AS ENUM ('easy', 'normal', 'hard');

-- Create bill_contents table
CREATE TABLE bill_contents (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(), -- ID
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE, -- 議案ID
  difficulty_level difficulty_level_enum NOT NULL, -- 難易度レベル
  title TEXT NOT NULL, -- タイトル
  summary TEXT NOT NULL, -- 要約
  content TEXT NOT NULL, -- Markdown形式
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 更新日時
  UNIQUE(bill_id, difficulty_level)
);

-- Create indexes
CREATE INDEX idx_bill_contents_bill_id ON bill_contents(bill_id);
CREATE INDEX idx_bill_contents_difficulty ON bill_contents(difficulty_level);

-- Create trigger for updated_at
CREATE TRIGGER update_bill_contents_updated_at BEFORE UPDATE ON bill_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE bill_contents ENABLE ROW LEVEL SECURITY;

-- Add table comments
COMMENT ON TABLE bill_contents IS '議案の難易度別コンテンツを管理するテーブル';
COMMENT ON COLUMN bill_contents.id IS 'ID';
COMMENT ON COLUMN bill_contents.bill_id IS '議案ID';
COMMENT ON COLUMN bill_contents.difficulty_level IS '難易度レベル（easy:やさしい, normal:ふつう, hard:難しい）';
COMMENT ON COLUMN bill_contents.title IS 'タイトル';
COMMENT ON COLUMN bill_contents.summary IS '要約';
COMMENT ON COLUMN bill_contents.content IS 'Markdown形式の議案内容';
COMMENT ON COLUMN bill_contents.created_at IS '作成日時';
COMMENT ON COLUMN bill_contents.updated_at IS '更新日時';