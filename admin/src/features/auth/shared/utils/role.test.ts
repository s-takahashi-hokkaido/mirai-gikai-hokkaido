import { describe, expect, it } from "vitest";
import { isAdminRole, isAllowedRole } from "./role";

describe("isAdminRole", () => {
  it.each([
    "admin",
    "legislator",
    "candidate",
  ])("既知のロールを受け入れる: %s", (value) => {
    expect(isAdminRole(value)).toBe(true);
  });

  it("未知の値は false", () => {
    expect(isAdminRole("editor")).toBe(false);
    expect(isAdminRole("")).toBe(false);
  });

  it("null / undefined は false", () => {
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe("isAllowedRole", () => {
  it("許可リストに含まれる場合は true", () => {
    expect(isAllowedRole("legislator", ["admin", "legislator"])).toBe(true);
  });

  it("含まれない場合は false", () => {
    expect(isAllowedRole("candidate", ["admin", "legislator"])).toBe(false);
  });

  it("空の許可リストは常に false", () => {
    expect(isAllowedRole("admin", [])).toBe(false);
  });
});
