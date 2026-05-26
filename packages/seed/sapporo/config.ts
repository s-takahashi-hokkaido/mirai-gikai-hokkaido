import type { SessionConfig } from "./types";

const BASE_URL = "https://www.city.sapporo.jp/gikai/html";

export const SESSIONS: Record<string, SessionConfig> = {
  "r8-2": {
    slug: "r8-2",
    name: "令和8年 第2回定例会",
    billListUrl: `${BASE_URL}/giantouichiran.html`,
  },
  "r8-1": {
    slug: "r8-1",
    name: "令和8年 第1回定例会",
    billListUrl: `${BASE_URL}/giantouichiran0801t.html`,
  },
};

export const DEFAULT_SESSION_SLUG = "r8-2";
