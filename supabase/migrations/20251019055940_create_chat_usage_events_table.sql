create table if not exists public.chat_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- ユーザーID
  session_id text, -- セッションID
  prompt_name text, -- プロンプト名
  model text not null, -- モデルID
  input_tokens integer not null default 0, -- 入力トークン数
  output_tokens integer not null default 0, -- 出力トークン数
  total_tokens integer not null default 0, -- 合計トークン数
  cost_usd numeric(12, 6) not null default 0, -- コスト(USD)
  metadata jsonb, -- メタデータ
  occurred_at timestamptz not null default now(), -- 発生日時
  created_at timestamptz not null default now() -- 作成日時
);

create index if not exists chat_usage_events_user_id_occurred_at_idx
  on public.chat_usage_events (user_id, occurred_at);

alter table public.chat_usage_events enable row level security;

COMMENT ON TABLE public.chat_usage_events IS 'チャットAI利用ログ';
COMMENT ON COLUMN public.chat_usage_events.user_id IS 'ユーザーID';
COMMENT ON COLUMN public.chat_usage_events.session_id IS 'セッションID';
COMMENT ON COLUMN public.chat_usage_events.prompt_name IS 'プロンプト名';
COMMENT ON COLUMN public.chat_usage_events.model IS 'モデルID';
COMMENT ON COLUMN public.chat_usage_events.input_tokens IS '入力トークン数';
COMMENT ON COLUMN public.chat_usage_events.output_tokens IS '出力トークン数';
COMMENT ON COLUMN public.chat_usage_events.total_tokens IS '合計トークン数';
COMMENT ON COLUMN public.chat_usage_events.cost_usd IS 'コスト(USD)';
COMMENT ON COLUMN public.chat_usage_events.metadata IS 'メタデータ';
COMMENT ON COLUMN public.chat_usage_events.occurred_at IS '発生日時';
COMMENT ON COLUMN public.chat_usage_events.created_at IS '作成日時';
