"use server";

import { getCurrentAdminUser } from "../lib/auth-server";

/**
 * ログイン直後に管理画面の利用資格があるかを確認する
 *
 * ロールは admin_profiles（DB）に持つため、ブラウザ側の JWT だけでは判定できない。
 * 資格が無いまま画面に入るとリダイレクトで弾かれるだけになるので、
 * ログイン時点でサーバーに確認してメッセージを出せるようにする。
 */
export async function hasAdminAccess(): Promise<boolean> {
  const user = await getCurrentAdminUser();
  return user !== null;
}
