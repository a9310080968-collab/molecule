import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const PASSWORD_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

export function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
    return `Password must contain between ${MIN_PASSWORD_LENGTH} and 128 characters.`;
  }
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
