// ============================================================
// PhoneShop Pro - minimal TOTP (RFC 6238) implementation
// No external OTP dependency needed.
// ============================================================

import { createHmac, randomBytes } from "crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(length = 20): string {
  const bytes = randomBytes(length);
  let secret = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      secret += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) secret += BASE32[(value << (5 - bits)) & 31];
  return secret;
}

export function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTOTP(secret: string, timeStep = 30, digits = 6, at?: number): string {
  const key = base32Decode(secret);
  const counter = Math.floor((at ?? Date.now()) / 1000 / timeStep);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  const clean = token.replace(/\s/g, "");
  if (!/^\d{6,8}$/.test(clean)) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, 30, clean.length, now + i * 30_000);
    if (expected === clean) return true;
  }
  return false;
}

export function buildOtpAuthUrl(secret: string, email: string, issuer = "PhoneShop Pro"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6`;
}
