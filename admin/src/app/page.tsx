import { redirect } from "next/navigation";

import { getCurrentAdminUser } from "@/features/auth/server/lib/auth-server";

export default async function HomePage() {
  const admin = await getCurrentAdminUser();

  // 利用資格のあるユーザーとしてログイン済みの場合はダッシュボードへ
  if (admin) {
    redirect("/bills");
  }

  // 未ログインまたは利用資格が無い場合はログイン画面へ
  redirect("/login");
}
