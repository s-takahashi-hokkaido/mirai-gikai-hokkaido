-- interview_configs テーブルに目安時間（分）カラムを追加
-- NULL の場合はタイムマネジメントしない
ALTER TABLE interview_configs ADD COLUMN estimated_duration INTEGER; -- 目安所要時間(分・NULLはタイムマネジメントしない)

COMMENT ON COLUMN interview_configs.estimated_duration IS '目安所要時間(分・NULLはタイムマネジメントしない)';
