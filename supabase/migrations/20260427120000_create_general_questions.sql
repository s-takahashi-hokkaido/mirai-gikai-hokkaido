create table general_questions (
  id                  uuid primary key default gen_random_uuid(),
  council_session_id  uuid not null references council_sessions(id) on delete cascade, -- 市議会定例会ID

  questioner_name     text not null, -- 質問者氏名
  questioner_party    text, -- 質問者会派
  questioner_number   int, -- 質問者番号
  session_day         int not null default 1, -- 開催日番号
  question_order      int not null default 1, -- 質問順序

  summary             text, -- 質問要約
  topics              jsonb not null default '[]', -- トピック一覧(JSON配列)

  raw_text            text, -- 原文
  source_url          text, -- 出典URL

  publish_status      text not null default 'draft' -- 公開状態(draft/published)
                        check (publish_status in ('draft', 'published')),

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table general_questions enable row level security;

create index on general_questions (council_session_id, session_day, question_order);
create index on general_questions (publish_status);

comment on table general_questions is '一般質問';
comment on column general_questions.council_session_id is '市議会定例会ID';
comment on column general_questions.questioner_name is '質問者氏名';
comment on column general_questions.questioner_party is '質問者会派';
comment on column general_questions.questioner_number is '質問者番号';
comment on column general_questions.session_day is '開催日番号';
comment on column general_questions.question_order is '質問順序';
comment on column general_questions.summary is '質問要約';
comment on column general_questions.topics is 'トピック一覧(JSON配列)';
comment on column general_questions.raw_text is '原文';
comment on column general_questions.source_url is '出典URL';
comment on column general_questions.publish_status is '公開状態(draft/published)';
