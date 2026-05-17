-- フェーズ間データ受け渡し用カラム
ALTER TABLE topic_analysis_versions ADD COLUMN phase_data JSONB; -- フェーズ間データ受け渡し用

COMMENT ON COLUMN topic_analysis_versions.phase_data IS 'フェーズ間データ受け渡し用';
