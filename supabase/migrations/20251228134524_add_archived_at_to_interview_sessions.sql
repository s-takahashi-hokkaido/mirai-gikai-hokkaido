-- interview_sessionsテーブルにarchived_atカラムを追加
-- セッションをアーカイブ（やり直し）した場合に設定される
ALTER TABLE interview_sessions ADD COLUMN archived_at TIMESTAMPTZ; -- アーカイブ日時（やり直し時に設定）

COMMENT ON COLUMN interview_sessions.archived_at IS 'アーカイブ日時（やり直し時に設定）';

