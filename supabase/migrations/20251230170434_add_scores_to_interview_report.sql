-- interview_report テーブルに scores カラムを追加
ALTER TABLE interview_report ADD COLUMN scores JSONB; -- 評価スコア(total, clarity, specificity, impact, constructiveness, reasoning)

-- コメント追加
COMMENT ON COLUMN interview_report.scores IS 'インタビューの評価スコア（total, clarity, specificity, impact, constructiveness, reasoning）';
