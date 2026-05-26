const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const REQUEST_INTERVAL_MS = 1000;

let lastRequestTime = 0;

// レート制限
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// HTML取得
export async function fetchHtml(
  url: string,
  encoding: "utf-8" | "shift_jis" = "utf-8"
): Promise<string> {
  await rateLimit();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "mirai-gikai-sapporo/1.0 (+https://github.com/s-takahashi-hokkaido)",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      if (encoding === "shift_jis") {
        const buf = await res.arrayBuffer();
        return new TextDecoder("shift_jis").decode(buf);
      }
      return await res.text();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = RETRY_BASE_MS * 2 ** (attempt - 1);
      console.warn(
        `⚠️  ${url} attempt ${attempt} failed, retrying in ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("unreachable");
}
