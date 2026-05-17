-- Add description column to tags table
ALTER TABLE tags
ADD COLUMN description text DEFAULT NULL; -- タグ説明文

COMMENT ON COLUMN tags.description IS 'Tag description text';
COMMENT ON COLUMN tags.description IS 'タグ説明文';
