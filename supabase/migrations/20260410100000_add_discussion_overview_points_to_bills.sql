alter table bills add column if not exists discussion_overview_points text[] not null default '{}'; -- 議論概要ポイント

comment on column bills.discussion_overview_points is '議論概要ポイント';
