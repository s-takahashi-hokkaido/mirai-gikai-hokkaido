/**
 * Basic認証の純粋関数
 *
 * web と admin の両方から使う。Next.js に依存する処理（NextRequest の解釈）は
 * 各アプリ側の薄いラッパーに置く。
 */

export type BasicAuthConfig = {
  username: string;
  password: string;
};

/** Authorization ヘッダーの値から認証情報を取り出す */
export function parseBasicAuth(
  authHeader: string
): { username: string; password: string } | null {
  try {
    const authValue = authHeader.split(" ")[1];
    if (!authValue) return null;

    const [username, password] = atob(authValue).split(":");
    return { username, password };
  } catch {
    return null;
  }
}

/** Authorization ヘッダーが設定と一致するか検証する */
export function validateBasicAuthHeader(
  header: string | null,
  config: BasicAuthConfig
): boolean {
  if (!header?.startsWith("Basic ")) {
    return false;
  }

  const credentials = parseBasicAuth(header);
  if (!credentials) {
    return false;
  }

  return (
    credentials.username === config.username &&
    credentials.password === config.password
  );
}

/** PageSpeed Insights からのアクセスかどうか（Basic認証をスキップする用） */
export function isPageSpeedInsightsUA(ua: string): boolean {
  return (
    ua.includes("Chrome-Lighthouse") ||
    ua.includes("PageSpeed Insights") ||
    ua.includes("Google Page Speed Insights")
  );
}

/**
 * HTMLナビゲーションのリクエストかどうか
 *
 * Basic認証は画面遷移だけを対象にする。全リクエストを challenge すると
 * サーバー間のAPI呼び出し（Bearer認証）が 401 で壊れるため。
 */
export function isHtmlAcceptHeader(accept: string): boolean {
  return accept.includes("text/html");
}

/** 401 と WWW-Authenticate を返すレスポンスを組み立てる */
export function createUnauthorizedResponse(realm = "Secure Area"): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}"`,
    },
  });
}
