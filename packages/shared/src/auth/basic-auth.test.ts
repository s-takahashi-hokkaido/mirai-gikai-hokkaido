import { describe, expect, it } from "vitest";
import {
  isHtmlAcceptHeader,
  isPageSpeedInsightsUA,
  parseBasicAuth,
  validateBasicAuthHeader,
} from "./basic-auth";

const config = { username: "user", password: "pass" };
const validHeader = `Basic ${btoa("user:pass")}`;

describe("parseBasicAuth", () => {
  it("Basicヘッダーからユーザー名とパスワードを取り出す", () => {
    expect(parseBasicAuth(validHeader)).toEqual({
      username: "user",
      password: "pass",
    });
  });

  it("値が無い場合は null を返す", () => {
    expect(parseBasicAuth("Basic")).toBeNull();
  });

  it("base64として不正な場合は null を返す", () => {
    expect(parseBasicAuth("Basic !!!not-base64!!!")).toBeNull();
  });
});

describe("validateBasicAuthHeader", () => {
  it("一致する場合は true", () => {
    expect(validateBasicAuthHeader(validHeader, config)).toBe(true);
  });

  it("ヘッダーが無い場合は false", () => {
    expect(validateBasicAuthHeader(null, config)).toBe(false);
  });

  it("Basic以外のスキームは false", () => {
    expect(validateBasicAuthHeader("Bearer token", config)).toBe(false);
  });

  it("パスワードが違う場合は false", () => {
    expect(
      validateBasicAuthHeader(`Basic ${btoa("user:wrong")}`, config)
    ).toBe(false);
  });

  it("ユーザー名が違う場合は false", () => {
    expect(
      validateBasicAuthHeader(`Basic ${btoa("other:pass")}`, config)
    ).toBe(false);
  });
});

describe("isPageSpeedInsightsUA", () => {
  it.each([
    "Mozilla/5.0 Chrome-Lighthouse",
    "Mozilla/5.0 PageSpeed Insights",
    "Google Page Speed Insights",
  ])("計測ツールのUAを判定する: %s", (ua) => {
    expect(isPageSpeedInsightsUA(ua)).toBe(true);
  });

  it("通常のブラウザUAは false", () => {
    expect(
      isPageSpeedInsightsUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
    ).toBe(false);
  });

  it("空文字は false", () => {
    expect(isPageSpeedInsightsUA("")).toBe(false);
  });
});

describe("isHtmlAcceptHeader", () => {
  it("HTMLを受け入れるリクエストは true", () => {
    expect(isHtmlAcceptHeader("text/html")).toBe(true);
    expect(
      isHtmlAcceptHeader("text/html,application/xhtml+xml,application/xml")
    ).toBe(true);
  });

  it("APIリクエストは false", () => {
    expect(isHtmlAcceptHeader("application/json")).toBe(false);
    expect(isHtmlAcceptHeader("")).toBe(false);
  });
});
