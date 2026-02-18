import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const AES_KEY_LENGTH = 32; // 256 bits

// ============================================================
// Per-File Key Generation (used with Proxy Re-Encryption)
// ============================================================

/**
 * Generate a random AES-256 key for encrypting a single file.
 * Each file gets its own unique key — no global key reuse.
 *
 * @returns AES key as 64-character hex string
 */
export function generatePerFileKey(): string {
  return crypto.randomBytes(AES_KEY_LENGTH).toString("hex");
}

/**
 * Encrypt a buffer using AES-256-CBC with a per-file key.
 * The key is generated randomly and returned alongside the encrypted data.
 *
 * Returns: { encryptedData: Buffer (IV + ciphertext), aesKeyHex: string }
 */
export function encryptBufferWithKey(buffer: Buffer): {
  encryptedData: Buffer;
  aesKeyHex: string;
} {
  const aesKeyHex = generatePerFileKey();
  const key = Buffer.from(aesKeyHex, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const encryptedData = Buffer.concat([iv, encrypted]);

  return { encryptedData, aesKeyHex };
}

/**
 * Decrypt an AES-256-CBC encrypted buffer using a specific AES key.
 * Used after recovering the AES key via Proxy Re-Encryption.
 *
 * @param encryptedBuffer - IV (16 bytes) + ciphertext
 * @param aesKeyHex - AES key as 64-character hex string
 * @returns Decrypted plaintext buffer
 */
export function decryptBufferWithKey(
  encryptedBuffer: Buffer,
  aesKeyHex: string
): Buffer {
  const key = Buffer.from(aesKeyHex, "hex");
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const encryptedData = encryptedBuffer.subarray(IV_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

// ============================================================
// Legacy Functions (backward compatibility for existing records)
// ============================================================

function getEncryptionKey(): Buffer {
  const key = process.env.AES_ENCRYPTION_KEY;
  if (!key) throw new Error("AES_ENCRYPTION_KEY not set in .env.local");
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a buffer using AES-256-CBC with the global env key.
 * @deprecated Use encryptBufferWithKey() for new records (PRE-compatible)
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypt an AES-256-CBC encrypted buffer with the global env key.
 * @deprecated Use decryptBufferWithKey() for PRE-encrypted records
 */
export function decryptBuffer(encryptedBuffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const encryptedData = encryptedBuffer.subarray(IV_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}
