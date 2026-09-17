import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const DUMMY_DIGEST =
  "scrypt$outline-password-dummy$-yDA3tByMpE4xLfZKfSNpKtk_1E-P0a2E3-4D-TNZBoa1nTenANwokAJpIHGEpUYuC9M__hPZafcnRWoCpoQNg";

const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });

/**
 * Creates a salted scrypt digest for a password.
 *
 * @param password The plaintext password.
 * @returns The serialized password digest.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const digest = await derive(password, salt);
  return `scrypt$${salt}$${digest.toString("base64url")}`;
}

/**
 * Checks a plaintext password against a serialized scrypt digest.
 *
 * @param password The plaintext password.
 * @param passwordDigest The stored digest, if one exists.
 * @returns Whether the password matches.
 */
export async function verifyPassword(
  password: string,
  passwordDigest: string | null
): Promise<boolean> {
  const digest = passwordDigest ?? DUMMY_DIGEST;
  const [algorithm, salt, encodedKey] = digest.split("$");

  if (algorithm !== "scrypt" || !salt || !encodedKey) {
    return false;
  }

  const expected = Buffer.from(encodedKey, "base64url");
  const actual = await derive(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
