-- Create preview_tokens table for managing preview access
CREATE TABLE preview_tokens (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(), -- ID
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE, -- 議案ID
    token TEXT NOT NULL UNIQUE, -- プレビュートークン文字列
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 有効期限
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
    created_by TEXT -- 作成者
);

-- Create index for efficient token lookup
CREATE INDEX idx_preview_tokens_token ON preview_tokens(token);
CREATE INDEX idx_preview_tokens_bill_id ON preview_tokens(bill_id);
CREATE INDEX idx_preview_tokens_expires_at ON preview_tokens(expires_at);

-- Enable RLS
ALTER TABLE preview_tokens ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE preview_tokens IS 'Preview tokens for bill access management';
COMMENT ON COLUMN preview_tokens.id IS 'ID';
COMMENT ON COLUMN preview_tokens.bill_id IS '議案ID';
COMMENT ON COLUMN preview_tokens.token IS 'Unique preview access token';
COMMENT ON COLUMN preview_tokens.expires_at IS 'Token expiration date (30 days)';
COMMENT ON COLUMN preview_tokens.created_at IS '作成日時';
COMMENT ON COLUMN preview_tokens.created_by IS '作成者';