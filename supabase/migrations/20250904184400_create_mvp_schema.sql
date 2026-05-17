-- Enable extensions schema & uuid-ossp
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- Create ENUM types
CREATE TYPE house_enum AS ENUM ('HR', 'HC');
CREATE TYPE bill_status_enum AS ENUM (
    'introduced',
    'in_originating_house',
    'in_receiving_house',
    'enacted',
    'rejected'
);
CREATE TYPE stance_type_enum AS ENUM ('for', 'against', 'neutral');
CREATE TYPE chat_role_enum AS ENUM ('user', 'system', 'assistant');

-- Create bills table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(), -- ID
    name TEXT NOT NULL, -- 議案名
    headline TEXT, -- 見出し
    description TEXT, -- 議案説明
    originating_house house_enum NOT NULL, -- 発議院（HR:衆議院, HC:参議院）
    status bill_status_enum NOT NULL, -- ステータス
    status_note TEXT, -- ステータス備考
    published_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 公開日時
    body_markdown TEXT, -- 本文(Markdown)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create mirai_stances table
CREATE TABLE mirai_stances (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(), -- ID
    bill_id UUID NOT NULL UNIQUE REFERENCES bills(id) ON DELETE CASCADE, -- 議案ID
    type stance_type_enum NOT NULL, -- スタンス種別(for:賛成 against:反対 neutral:中立 等)
    comment TEXT, -- コメント
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create chats table
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(), -- ID
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE, -- 議案ID
    user_id UUID, -- ユーザーID
    role chat_role_enum NOT NULL, -- メッセージ送信者役割(user/system/assistant)
    message TEXT NOT NULL, -- メッセージ本文
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create indexes for bills table
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_published_at ON bills(published_at DESC);
CREATE INDEX idx_bills_originating_house ON bills(originating_house);

-- Create indexes for mirai_stances table
CREATE INDEX idx_mirai_stances_bill_id ON mirai_stances(bill_id);
CREATE INDEX idx_mirai_stances_type ON mirai_stances(type);

-- Create indexes for chats table
CREATE INDEX idx_chats_bill_id ON chats(bill_id);
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chats_bill_user ON chats(bill_id, user_id);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mirai_stances_updated_at BEFORE UPDATE ON mirai_stances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (all access denied by default)
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirai_stances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- No policies are created, so all access is denied by default
-- Access will only be possible using Supabase Service Role Key from server-side

-- Add comments to tables and columns for documentation
COMMENT ON TABLE bills IS '議案の基本情報を管理するテーブル';
COMMENT ON COLUMN bills.id IS 'ID';
COMMENT ON COLUMN bills.name IS '議案名';
COMMENT ON COLUMN bills.headline IS '見出し';
COMMENT ON COLUMN bills.description IS '議案説明';
COMMENT ON COLUMN bills.originating_house IS '発議院（HR:衆議院, HC:参議院）';
COMMENT ON COLUMN bills.status IS '議案のステータス';
COMMENT ON COLUMN bills.status_note IS 'ステータス備考';
COMMENT ON COLUMN bills.published_at IS 'サービスでの議案公開日時';
COMMENT ON COLUMN bills.body_markdown IS '本文(Markdown)';
COMMENT ON COLUMN bills.created_at IS '作成日時';
COMMENT ON COLUMN bills.updated_at IS '更新日時';

COMMENT ON TABLE mirai_stances IS 'チームみらい（安野議員）の公式スタンスを記録するテーブル';
COMMENT ON COLUMN mirai_stances.id IS 'ID';
COMMENT ON COLUMN mirai_stances.bill_id IS '議案ID';
COMMENT ON COLUMN mirai_stances.type IS 'スタンス（for:賛成, against:反対, neutral:中立）';
COMMENT ON COLUMN mirai_stances.comment IS 'コメント';
COMMENT ON COLUMN mirai_stances.created_at IS '作成日時';
COMMENT ON COLUMN mirai_stances.updated_at IS '更新日時';

COMMENT ON TABLE chats IS 'AIとの対話履歴を管理するテーブル';
COMMENT ON COLUMN chats.id IS 'ID';
COMMENT ON COLUMN chats.bill_id IS '議案ID';
COMMENT ON COLUMN chats.user_id IS 'ユーザーID（Supabase匿名認証）';
COMMENT ON COLUMN chats.role IS 'メッセージの送信者役割';
COMMENT ON COLUMN chats.message IS 'メッセージ本文';
COMMENT ON COLUMN chats.created_at IS '作成日時';
COMMENT ON COLUMN chats.updated_at IS '更新日時';