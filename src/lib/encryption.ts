import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.AES_ENCRYPTION_KEY;
  if (!key) throw new Error("AES_ENCRYPTION_KEY not set in .env.local");
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a buffer using AES-256-CBC
 * Returns: IV (16 bytes) + encrypted data
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

  // Prepend IV to encrypted data
  return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypt an AES-256-CBC encrypted buffer
 * Expects: IV (first 16 bytes) + encrypted data
 */
export function decryptBuffer(encryptedBuffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const encryptedData = encryptedBuffer.subarray(IV_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}
