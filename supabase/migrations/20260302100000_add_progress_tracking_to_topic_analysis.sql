ALTER TABLE topic_analysis_versions
  ADD COLUMN current_step TEXT, -- 現在のステップ
  ADD COLUMN started_at TIMESTAMPTZ, -- 開始日時
  ADD COLUMN completed_at TIMESTAMPTZ; -- 完了日時

COMMENT ON COLUMN topic_analysis_versions.current_step IS '現在のステップ';
COMMENT ON COLUMN topic_analysis_versions.started_at IS '開始日時';
COMMENT ON COLUMN topic_analysis_versions.completed_at IS '完了日時';
