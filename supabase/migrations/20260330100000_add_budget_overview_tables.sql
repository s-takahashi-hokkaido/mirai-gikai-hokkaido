-- budget_overviews: one row per department per session
create table budget_overviews (
  id uuid primary key default gen_random_uuid(),
  council_session_id uuid not null references council_sessions(id), -- 市議会定例会ID
  department_name text not null, -- 部局名
  department_slug text not null, -- 部局スラッグ
  direction text, -- 方針
  total_budget bigint, -- 当年度予算総額
  prev_budget bigint, -- 前年度予算総額
  source_url text, -- 出典URL
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published')), -- 公開状態(draft/published)
  sort_order integer not null default 0, -- 表示順
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (council_session_id, department_slug)
);
alter table budget_overviews enable row level security;

-- budget_themes: major themes per department (e.g. "福岡100の推進")
create table budget_themes (
  id uuid primary key default gen_random_uuid(),
  overview_id uuid not null references budget_overviews(id) on delete cascade, -- 予算概要ID
  title text not null, -- テーマタイトル
  budget_amount bigint, -- 予算額
  ai_summary text, -- AI要約
  sort_order integer not null default 0, -- 表示順
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table budget_themes enable row level security;

-- budget_initiatives: individual projects per theme
create table budget_initiatives (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references budget_themes(id) on delete cascade, -- 予算テーマID
  title text not null, -- 施策タイトル
  budget_amount bigint, -- 予算額
  badge text check (badge in ('new', 'expanded', 'continued', null)), -- バッジ種別(new/expanded/continued)
  description text, -- 施策説明
  sort_order integer not null default 0, -- 表示順
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table budget_initiatives enable row level security;

comment on table budget_overviews is '予算概要(部局ごと×定例会ごと)';
comment on column budget_overviews.council_session_id is '市議会定例会ID';
comment on column budget_overviews.department_name is '部局名';
comment on column budget_overviews.department_slug is '部局スラッグ';
comment on column budget_overviews.direction is '方針';
comment on column budget_overviews.total_budget is '当年度予算総額';
comment on column budget_overviews.prev_budget is '前年度予算総額';
comment on column budget_overviews.source_url is '出典URL';
comment on column budget_overviews.publish_status is '公開状態(draft/published)';
comment on column budget_overviews.sort_order is '表示順';

comment on table budget_themes is '予算テーマ(部局の主要テーマ。例:「福岡100の推進」)';
comment on column budget_themes.overview_id is '予算概要ID';
comment on column budget_themes.title is 'テーマタイトル';
comment on column budget_themes.budget_amount is '予算額';
comment on column budget_themes.ai_summary is 'AI要約';
comment on column budget_themes.sort_order is '表示順';

comment on table budget_initiatives is '予算施策(テーマごとの個別施策)';
comment on column budget_initiatives.theme_id is '予算テーマID';
comment on column budget_initiatives.title is '施策タイトル';
comment on column budget_initiatives.budget_amount is '予算額';
comment on column budget_initiatives.badge is 'バッジ種別(new/expanded/continued)';
comment on column budget_initiatives.description is '施策説明';
comment on column budget_initiatives.sort_order is '表示順';
