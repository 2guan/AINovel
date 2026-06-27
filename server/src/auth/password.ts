import crypto from "node:crypto";

const HASH_PREFIX = "pbkdf2_sha256";
const DEFAULT_ITERATIONS = 310_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, DEFAULT_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return `${HASH_PREFIX}$${DEFAULT_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [prefix, iterationsText, salt, expectedHash] = storedHash.split("$");
  const iterations = Number(iterationsText);
  if (prefix !== HASH_PREFIX || !Number.isInteger(iterations) || !salt || !expectedHash) {
    return false;
  }

  const actual = crypto
    .pbkdf2Sync(password, salt, iterations, Buffer.from(expectedHash, "hex").length, DIGEST)
    .toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
