-- 管理画面のロールと会派の紐付けを持つテーブル
--
-- ロールを app_metadata(JWT) ではなくテーブルで持つ理由:
--   - SQL から引けて外部キーを張れる（会派との紐付けが必要なため）
--   - 認可判定をアプリ層（Server Components / Server Actions）に寄せる方針のため
--
-- RLS は有効化するがポリシーは定義しない（Service Role 経由のみ）
create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'legislator', 'candidate')),
  faction_id uuid references public.factions(id) on delete restrict,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- legislator は必ず会派に属し、それ以外は会派を持たない
  constraint admin_profiles_faction_required check (
    (role = 'legislator' and faction_id is not null)
    or (role <> 'legislator' and faction_id is null)
  )
);

alter table public.admin_profiles enable row level security;

create index admin_profiles_role_idx on public.admin_profiles (role);
create index admin_profiles_faction_id_idx on public.admin_profiles (faction_id);

comment on table public.admin_profiles is '管理画面利用者のロールと所属会派';
comment on column public.admin_profiles.role is 'ロール(admin:運営者 / legislator:議員 / candidate:出馬者)';
comment on column public.admin_profiles.faction_id is '所属会派ID(legislatorのみ必須)';
comment on column public.admin_profiles.display_name is '表示名(監査ログや画面表示に使用)';

-- 既存の admin ユーザーを移行する。
-- 従来は auth.users.raw_app_meta_data の roles 配列で admin を判定していた。
insert into public.admin_profiles (user_id, role, display_name)
select
  u.id,
  'admin',
  coalesce(u.email, u.id::text)
from auth.users u
where u.raw_app_meta_data -> 'roles' ? 'admin'
on conflict (user_id) do nothing;
