-- AI利用コストの合計を取得する関数
--
-- chat_usage_events を JS 側で全件取得して合算すると PostgREST の max_rows(1000) で
-- 打ち切られ、コストを過小評価してしまう。上限判定が効かなくなるため DB 側で合算する。
--
-- target_user_id を渡すとそのユーザー分、null なら全ユーザー合計を返す。
create or replace function public.get_ai_usage_cost_usd(
  from_ts timestamptz,
  to_ts timestamptz,
  target_user_id uuid default null
) returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_usd), 0)
  from public.chat_usage_events
  where occurred_at >= from_ts
    and occurred_at < to_ts
    and (target_user_id is null or user_id = target_user_id);
$$;

comment on function public.get_ai_usage_cost_usd(timestamptz, timestamptz, uuid)
  is 'AI利用コスト(USD)の合計を返す。target_user_idがnullなら全ユーザー合計';

-- 関数権限: service_role のみ実行可（get_admin_users と同じ方針）
revoke execute on function public.get_ai_usage_cost_usd(timestamptz, timestamptz, uuid) from public;
revoke execute on function public.get_ai_usage_cost_usd(timestamptz, timestamptz, uuid) from anon;
revoke execute on function public.get_ai_usage_cost_usd(timestamptz, timestamptz, uuid) from authenticated;
grant execute on function public.get_ai_usage_cost_usd(timestamptz, timestamptz, uuid) to service_role;

-- 日次集計のためのインデックス
create index if not exists chat_usage_events_occurred_at_idx
  on public.chat_usage_events (occurred_at);
