create table bill_discussions (
  id                uuid primary key default gen_random_uuid(),
  bill_id           uuid not null references bills(id) on delete cascade, -- 議案ID
  session_day       int not null, -- 開催日番号
  questioner_name   text not null, -- 質問者氏名
  questioner_number text, -- 質問者番号
  questioner_party  text, -- 質問者会派
  question_summary  text, -- 質問要約
  question_raw      text, -- 質問原文
  answerer_role     text, -- 回答者役職
  answerer_name     text, -- 回答者氏名
  answer_summary    text, -- 回答要約
  answer_raw        text, -- 回答原文
  exchange_count    int not null default 1, -- 質疑回数
  created_at        timestamptz not null default now()
);

alter table bill_discussions enable row level security;

create index bill_discussions_bill_id_idx on bill_discussions(bill_id);

alter table bill_discussions
  add constraint bill_discussions_bill_id_questioner_name_key
  unique (bill_id, questioner_name);

comment on table bill_discussions is '議案討論記録';
comment on column bill_discussions.bill_id is '議案ID';
comment on column bill_discussions.session_day is '開催日番号';
comment on column bill_discussions.questioner_name is '質問者氏名';
comment on column bill_discussions.questioner_number is '質問者番号';
comment on column bill_discussions.questioner_party is '質問者会派';
comment on column bill_discussions.question_summary is '質問要約';
comment on column bill_discussions.question_raw is '質問原文';
comment on column bill_discussions.answerer_role is '回答者役職';
comment on column bill_discussions.answerer_name is '回答者氏名';
comment on column bill_discussions.answer_summary is '回答要約';
comment on column bill_discussions.answer_raw is '回答原文';
comment on column bill_discussions.exchange_count is '質疑回数';
