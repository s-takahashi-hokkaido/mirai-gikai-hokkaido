create table press_conferences (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique, -- URL用スラッグ
  title        text        not null, -- 会見タイトル
  held_at      date        not null, -- 開催日
  youtube_url  text, -- YouTube動画URL
  status       text        not null default 'draft' -- ステータス(draft/structuring/review/published/error)
                 check (status in ('draft', 'structuring', 'review', 'published', 'error')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table press_conferences enable row level security;

create index on press_conferences (slug);
create index on press_conferences (held_at desc);
create index on press_conferences (status);

create table press_conference_items (
  id                   uuid        primary key default gen_random_uuid(),
  press_conference_id  uuid        not null references press_conferences(id) on delete cascade, -- 記者会見ID
  item_type            text        not null check (item_type in ('announcement', 'qa')), -- 項目種別(announcement:発表 / qa:質疑応答)
  order_index          int         not null, -- 表示順
  title                text        not null, -- 項目タイトル
  summary              text, -- 要約
  created_at           timestamptz default now()
);

alter table press_conference_items enable row level security;

create index on press_conference_items (press_conference_id, order_index);

create table press_conference_turns (
  id                        uuid        primary key default gen_random_uuid(),
  press_conference_item_id  uuid        not null references press_conference_items(id) on delete cascade, -- 記者会見項目ID
  speaker                   text        not null check (speaker in ('mayor', 'reporter')), -- 発話者(mayor:市長 / reporter:記者)
  speaker_name              text, -- 発話者名
  content                   text        not null, -- 発言内容
  order_index               int         not null, -- 表示順
  created_at                timestamptz default now()
);

alter table press_conference_turns enable row level security;

create index on press_conference_turns (press_conference_item_id, order_index);

comment on table press_conferences is '記者会見';
comment on column press_conferences.slug is 'URL用スラッグ';
comment on column press_conferences.title is '会見タイトル';
comment on column press_conferences.held_at is '開催日';
comment on column press_conferences.youtube_url is 'YouTube動画URL';
comment on column press_conferences.status is 'ステータス(draft/structuring/review/published/error)';

comment on table press_conference_items is '記者会見項目';
comment on column press_conference_items.press_conference_id is '記者会見ID';
comment on column press_conference_items.item_type is '項目種別(announcement:発表 / qa:質疑応答)';
comment on column press_conference_items.order_index is '表示順';
comment on column press_conference_items.title is '項目タイトル';
comment on column press_conference_items.summary is '要約';

comment on table press_conference_turns is '記者会見の発言ターン';
comment on column press_conference_turns.press_conference_item_id is '記者会見項目ID';
comment on column press_conference_turns.speaker is '発話者(mayor:市長 / reporter:記者)';
comment on column press_conference_turns.speaker_name is '発話者名';
comment on column press_conference_turns.content is '発言内容';
comment on column press_conference_turns.order_index is '表示順';
