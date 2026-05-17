-- Create ENUM types for interview feature
CREATE TYPE interview_config_status_enum AS ENUM ('public', 'closed');
CREATE TYPE interview_role_enum AS ENUM ('assistant', 'user');

-- Create interview_configs table
CREATE TABLE interview_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL UNIQUE REFERENCES bills(id) ON DELETE CASCADE, -- 対象議案ID
  status interview_config_status_enum NOT NULL DEFAULT 'closed', -- 設定ステータス(public:公開/有効, closed:非公開/無効)
  themes TEXT[], -- テーマ配列
  knowledge_source TEXT, -- 議案コンテキスト情報
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create interview_questions table
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_config_id UUID NOT NULL REFERENCES interview_configs(id) ON DELETE CASCADE, -- インタビュー設定ID
  question TEXT NOT NULL, -- 質問文
  instruction TEXT, -- AIへの指示（質問の深掘り方法など）
  quick_replies TEXT[], -- クイックリプライ候補
  question_order INTEGER NOT NULL, -- 質問順序
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create interview_sessions table
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_config_id UUID NOT NULL REFERENCES interview_configs(id) ON DELETE CASCADE, -- インタビュー設定ID
  user_id UUID NOT NULL, -- ユーザーID（匿名認証）
  langfuse_session_id TEXT, -- LangfuseセッションID
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 開始日時
  completed_at TIMESTAMP WITH TIME ZONE, -- 完了日時
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create interview_messages table
CREATE TABLE interview_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE, -- インタビューセッションID
  role interview_role_enum NOT NULL, -- メッセージ役割(assistant:AIからの質問, user:ユーザーの回答)
  content TEXT NOT NULL, -- メッセージ内容
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 作成日時
);

-- Create interview_report table
CREATE TABLE interview_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE, -- インタビューセッションID
  summary TEXT, -- インタビュー要約
  stance stance_type_enum, -- AIが分析したユーザーのスタンス
  role TEXT, -- AIが推論したユーザーの役割
  role_description TEXT, -- 役割の説明
  opinions JSONB, -- 意見配列 [{title, content}, ...]
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 作成日時
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() -- 更新日時
);

-- Create indexes for interview_configs
CREATE INDEX idx_interview_configs_status ON interview_configs(status);

-- Create indexes for interview_questions
CREATE INDEX idx_interview_questions_config_id ON interview_questions(interview_config_id);
CREATE INDEX idx_interview_questions_config_order ON interview_questions(interview_config_id, question_order);

-- Create indexes for interview_sessions
CREATE INDEX idx_interview_sessions_config_id ON interview_sessions(interview_config_id);
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_config_user ON interview_sessions(interview_config_id, user_id);
CREATE INDEX idx_interview_sessions_started_at ON interview_sessions(started_at);

-- Create indexes for interview_messages
CREATE INDEX idx_interview_messages_session_id ON interview_messages(interview_session_id);
CREATE INDEX idx_interview_messages_session_created ON interview_messages(interview_session_id, created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_interview_configs_updated_at BEFORE UPDATE ON interview_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_questions_updated_at BEFORE UPDATE ON interview_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_report_updated_at BEFORE UPDATE ON interview_report
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE interview_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_report ENABLE ROW LEVEL SECURITY;

-- No policies are created, so all access is denied by default
-- Access will only be possible using Supabase Service Role Key from server-side

-- Add comments for documentation
COMMENT ON TABLE interview_configs IS '議案ごとのインタビュー設定を管理するテーブル';
COMMENT ON COLUMN interview_configs.bill_id IS '対象議案ID（1議案1設定）';
COMMENT ON COLUMN interview_configs.status IS '設定ステータス（public: 公開/有効, closed: 非公開/無効）';
COMMENT ON COLUMN interview_configs.themes IS 'テーマの配列';
COMMENT ON COLUMN interview_configs.knowledge_source IS '議案のコンテキスト情報';

COMMENT ON TABLE interview_questions IS '事前定義されたインタビュー質問を管理するテーブル';
COMMENT ON COLUMN interview_questions.interview_config_id IS 'インタビュー設定ID';
COMMENT ON COLUMN interview_questions.question IS '質問文';
COMMENT ON COLUMN interview_questions.instruction IS 'AIへの指示（質問の深掘り方法など）';
COMMENT ON COLUMN interview_questions.quick_replies IS 'ユーザーが選択できるクイックリプライ';
COMMENT ON COLUMN interview_questions.question_order IS '質問の順序';

COMMENT ON TABLE interview_sessions IS 'インタビューセッションを管理するテーブル';
COMMENT ON COLUMN interview_sessions.interview_config_id IS 'インタビュー設定ID';
COMMENT ON COLUMN interview_sessions.user_id IS 'ユーザーID（匿名認証）';
COMMENT ON COLUMN interview_sessions.langfuse_session_id IS 'LangfuseセッションID';
COMMENT ON COLUMN interview_sessions.started_at IS '開始日時';
COMMENT ON COLUMN interview_sessions.completed_at IS '完了日時';

COMMENT ON TABLE interview_messages IS 'インタビュー内の質問と回答を保存するテーブル';
COMMENT ON COLUMN interview_messages.interview_session_id IS 'インタビューセッションID';
COMMENT ON COLUMN interview_messages.role IS 'メッセージの役割（assistant: AIからの質問, user: ユーザーからの回答）';
COMMENT ON COLUMN interview_messages.content IS 'メッセージ内容';

COMMENT ON TABLE interview_report IS 'インタビュー結果のレポートを保存するテーブル（AIが自動生成）';
COMMENT ON COLUMN interview_report.interview_session_id IS 'インタビューセッションID（1セッション1レポート）';
COMMENT ON COLUMN interview_report.summary IS 'インタビュー要約';
COMMENT ON COLUMN interview_report.stance IS 'AIが分析したユーザーのスタンス';
COMMENT ON COLUMN interview_report.role IS 'AIが推論したユーザーの役割';
COMMENT ON COLUMN interview_report.role_description IS '役割の説明';
COMMENT ON COLUMN interview_report.opinions IS '意見の配列 [{title: string, content: string}, ...]';

COMMENT ON COLUMN interview_configs.created_at IS '作成日時';
COMMENT ON COLUMN interview_configs.updated_at IS '更新日時';
COMMENT ON COLUMN interview_questions.created_at IS '作成日時';
COMMENT ON COLUMN interview_questions.updated_at IS '更新日時';
COMMENT ON COLUMN interview_sessions.created_at IS '作成日時';
COMMENT ON COLUMN interview_sessions.updated_at IS '更新日時';
COMMENT ON COLUMN interview_messages.created_at IS '作成日時';
COMMENT ON COLUMN interview_report.created_at IS '作成日時';
COMMENT ON COLUMN interview_report.updated_at IS '更新日時';

