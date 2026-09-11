import { describe, expect, it } from "vitest";
import { csvFilename, EXPORT_MODULES, toCSV } from "@/lib/csv";
import { base32Decode, buildOtpAuthUrl, generateSecret, generateTOTP, verifyTOTP } from "@/lib/totp";

describe("TOTP", () => {
  it("generates a base32 secret", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBeGreaterThan(20);
  });

  it("round-trips base32 decode", () => {
    const s = generateSecret(10);
    const bytes = base32Decode(s);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("generates and verifies codes", () => {
    const secret = generateSecret();
    const code = generateTOTP(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTOTP(code, secret)).toBe(true);
  });

  it("rejects wrong codes", () => {
    const secret = generateSecret();
    expect(verifyTOTP("000000", secret)).toBe(false);
    expect(verifyTOTP("abc", secret)).toBe(false);
    expect(verifyTOTP("", secret)).toBe(false);
  });

  it("accepts codes within the time window", () => {
    const secret = generateSecret();
    const past = generateTOTP(secret, 30, 6, Date.now() - 30_000);
    expect(verifyTOTP(past, secret)).toBe(true);
  });

  it("builds an otpauth URL", () => {
    const url = buildOtpAuthUrl("JBSWY3DPEE", "user@test.com");
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=JBSWY3DPEE");
  });
});

describe("CSV export", () => {
  it("exports 6 modules", () => {
    expect(EXPORT_MODULES).toHaveLength(6);
  });

  it("converts rows to CSV with headers", () => {
    const csv = toCSV([{ a: 1, b: "x" }, { a: 2, b: "y" }]);
    expect(csv).toContain("a,b");
    expect(csv).toContain("1,x");
  });

  it("escapes commas, quotes and newlines", () => {
    const csv = toCSV([{ note: 'he said "hi, yo"\nbye' }]);
    expect(csv).toContain('"he said ""hi, yo""\nbye"');
  });

  it("handles empty rows", () => {
    expect(toCSV([])).toBe("");
  });

  it("starts with a UTF-8 BOM for Excel/Arabic", () => {
    expect(toCSV([{ a: "مرحبا" }].map((r) => r)).charCodeAt(0)).toBe(0xfeff);
  });

  it("builds dated filenames", () => {
    expect(csvFilename("repairs")).toMatch(/^phoneshop-repairs-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
