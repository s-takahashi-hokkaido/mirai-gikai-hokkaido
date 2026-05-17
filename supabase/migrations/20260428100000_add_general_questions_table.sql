-- 一般質問テーブル
create table if not exists public.general_questions (
  id uuid primary key default gen_random_uuid(),
  council_session_id uuid not null references public.council_sessions(id) on delete cascade, -- 市議会定例会ID
  session_day integer not null, -- 開催日番号
  question_order integer not null, -- 質問順序
  questioner_name text not null, -- 質問者氏名
  questioner_party text, -- 質問者会派
  questioner_number integer, -- 質問者番号
  summary text not null, -- 質問要約
  topics jsonb not null default '[]'::jsonb, -- トピック一覧(JSON配列)
  raw_text text not null, -- 原文
  source_url text, -- 出典URL
  publish_status text not null default 'draft', -- 公開状態(draft/published)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (council_session_id, session_day, question_order)
);

alter table public.general_questions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'update_general_questions_updated_at'
  ) then
    create trigger update_general_questions_updated_at
      before update on public.general_questions
      for each row execute function update_updated_at_column();
  end if;
end $$;

comment on table public.general_questions is '一般質問';
comment on column public.general_questions.council_session_id is '市議会定例会ID';
comment on column public.general_questions.session_day is '開催日番号';
comment on column public.general_questions.question_order is '質問順序';
comment on column public.general_questions.questioner_name is '質問者氏名';
comment on column public.general_questions.questioner_party is '質問者会派';
comment on column public.general_questions.questioner_number is '質問者番号';
comment on column public.general_questions.summary is '質問要約';
comment on column public.general_questions.topics is 'トピック一覧(JSON配列)';
comment on column public.general_questions.raw_text is '原文';
comment on column public.general_questions.source_url is '出典URL';
comment on column public.general_questions.publish_status is '公開状態(draft/published)';
