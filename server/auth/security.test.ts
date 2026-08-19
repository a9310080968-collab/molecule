import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSessionToken, hashPassword, hashSessionToken, validatePassword, verifyPassword } from "./security.js";

describe("password security", () => {
  it("rejects weak passwords", () => {
    assert.match(validatePassword("short") ?? "", /12/);
    assert.match(validatePassword("onlyletterslong") ?? "", /letter and one number/);
  });

  it("hashes and verifies passwords", async () => {
    const password = "PilotPassword42";
    const hash = await hashPassword(password);
    assert.notEqual(hash, password);
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword("WrongPassword42", hash), false);
  });
});

describe("session security", () => {
  it("creates opaque tokens and stable hashes", () => {
    const token = createSessionToken();
    assert.ok(token.length >= 40);
    assert.equal(hashSessionToken(token), hashSessionToken(token));
    assert.equal(hashSessionToken(token).length, 64);
  });
});
