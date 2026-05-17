-- Create tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID
    label TEXT NOT NULL UNIQUE, -- タグ表示名
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create bills_tags junction table
CREATE TABLE bills_tags (
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE, -- 議案ID
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE, -- タグID
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
    PRIMARY KEY (bill_id, tag_id)
);

-- Create trigger for tags updated_at
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills_tags ENABLE ROW LEVEL SECURITY;

-- No policies are created, so all access is denied by default
-- Access will only be possible using Supabase Service Role Key from server-side

-- Add comments for documentation
COMMENT ON TABLE tags IS 'Master table for tags';
COMMENT ON COLUMN tags.id IS 'ID';
COMMENT ON COLUMN tags.label IS 'Tag label (display name)';
COMMENT ON COLUMN tags.created_at IS '作成日時';
COMMENT ON COLUMN tags.updated_at IS '更新日時';

COMMENT ON TABLE bills_tags IS 'Junction table for bills and tags relationship';
COMMENT ON COLUMN bills_tags.bill_id IS 'Bill ID';
COMMENT ON COLUMN bills_tags.tag_id IS 'Tag ID';
COMMENT ON COLUMN bills_tags.created_at IS '作成日時';
