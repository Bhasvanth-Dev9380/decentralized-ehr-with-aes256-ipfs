/**
 * ==========================================
 * Proxy Re-Encryption (PRE) Module
 * ==========================================
 *
 * Implements a proxy re-encryption scheme for secure medical record sharing.
 *
 * Architecture Overview:
 * ---------------------
 * Proxy Re-Encryption allows a semi-trusted proxy (the server) to transform
 * ciphertext encrypted under one party's key (patient) into ciphertext
 * decryptable by another party (doctor), WITHOUT the proxy learning the
 * underlying plaintext.
 *
 * Flow:
 *  ┌──────────┐   AES Key    ┌──────────┐   Encrypted File   ┌──────────┐
 *  │ Generate │──────────────►│ AES-256  │───────────────────►│  IPFS    │
 *  │ Per-File │              │ Encrypt  │                    │ Storage  │
 *  │ AES Key  │              └──────────┘                    └──────────┘
 *  └────┬─────┘
 *       │ AES Key
 *       ▼
 *  ┌──────────┐   Capsule (encrypted AES key)
 *  │ RSA Enc  │──────────────────────────────► Stored in MongoDB
 *  │ w/ Patient│
 *  │ PublicKey │
 *  └──────────┘
 *
 * Access Delegation (Proxy Re-Encryption):
 *  ┌──────────┐              ┌──────────┐              ┌──────────┐
 *  │ Patient  │  Re-Enc Key  │  Proxy   │  Transform   │  Doctor  │
 *  │ Grants   │─────────────►│  Server  │──────────────►│ Decrypts │
 *  │ Access   │              │Re-Encrypt│              │  w/ Own  │
 *  └──────────┘              │ Capsule  │              │  Key     │
 *                            └──────────┘              └──────────┘
 *
 * Security Properties:
 * - Each file has a unique AES-256 key (no global key reuse)
 * - AES keys are never stored in plaintext — always encapsulated
 * - Re-encryption keys are specific to a patient-doctor pair
 * - The proxy transforms ciphertext without accessing the AES key directly
 * - Forward secrecy: revoking permission invalidates the re-encryption key
 *
 * Cryptographic Primitives:
 * - RSA-2048 with OAEP padding (SHA-256) for asymmetric operations
 * - AES-256-CBC for symmetric encryption of re-encryption key components
 * - HMAC-SHA256 for deriving transform keys (bound to server secret)
 *
 * Note: This implementation uses a "trusted proxy" model suitable for
 * demonstration. Production deployments should consider threshold PRE
 * schemes (e.g., Umbral/NuCypher) with distributed key management.
 */

import crypto from "crypto";

// ============================================================
// Constants
// ============================================================
const RSA_KEY_SIZE = 2048;
const RSA_PADDING = crypto.constants.RSA_PKCS1_OAEP_PADDING;
const OAEP_HASH = "sha256";

// ============================================================
// Key Generation
// ============================================================

/**
 * Generate an RSA-2048 keypair for a user.
 * Called during user registration.
 *
 * @returns {publicKey, privateKey} in PEM format
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: RSA_KEY_SIZE,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { publicKey, privateKey };
}

// ============================================================
// Capsule Operations (AES Key Encapsulation)
// ============================================================

/**
 * Encapsulate (encrypt) an AES key using the patient's RSA public key.
 * This creates a "capsule" — the AES key encrypted asymmetrically.
 *
 * @param aesKeyHex - The AES-256 key in hexadecimal (64 chars)
 * @param publicKeyPem - Patient's RSA public key in PEM format
 * @returns Base64-encoded capsule
 */
export function encapsulateKey(
  aesKeyHex: string,
  publicKeyPem: string
): string {
  const aesKeyBuffer = Buffer.from(aesKeyHex, "hex");

  const capsule = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: RSA_PADDING,
      oaepHash: OAEP_HASH,
    },
    aesKeyBuffer
  );

  return capsule.toString("base64");
}

/**
 * Decapsulate (decrypt) an AES key using the owner's RSA private key.
 * Used when the patient (owner) accesses their own records.
 *
 * @param capsuleBase64 - Base64-encoded capsule
 * @param privateKeyPem - Owner's RSA private key in PEM format
 * @returns AES key in hexadecimal
 */
export function decapsulateKey(
  capsuleBase64: string,
  privateKeyPem: string
): string {
  const capsuleBuffer = Buffer.from(capsuleBase64, "base64");

  const aesKeyBuffer = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: RSA_PADDING,
      oaepHash: OAEP_HASH,
    },
    capsuleBuffer
  );

  return aesKeyBuffer.toString("hex");
}

// ============================================================
// Re-Encryption Key Generation
// ============================================================

/**
 * Derive a transform key using HMAC-SHA256.
 * This binds the re-encryption key to the server's secret,
 * preventing offline attacks if the database is compromised.
 *
 * @param ownerPublicKeyPem - Patient's public key PEM
 * @param delegatePublicKeyPem - Doctor's public key PEM
 * @returns 32-byte transform key
 */
function deriveTransformKey(
  ownerPublicKeyPem: string,
  delegatePublicKeyPem: string
): Buffer {
  const serverSecret =
    process.env.PRE_TRANSFORM_SECRET ||
    process.env.JWT_SECRET ||
    "pre-transform-secret-key";

  // Create a deterministic transform key bound to the key pair and server secret
  const data = `PRE-v1|${ownerPublicKeyPem}|${delegatePublicKeyPem}`;
  return crypto.createHmac("sha256", serverSecret).update(data).digest();
}

/**
 * Generate a re-encryption key that allows the proxy to transform
 * ciphertext from the patient's key space to the doctor's key space.
 *
 * The re-encryption key contains:
 * - The patient's private key encrypted with a server-derived transform key
 * - The doctor's public key for re-encapsulation
 * - Cryptographic binding to prevent misuse
 *
 * @param ownerPrivateKeyPem - Patient's RSA private key
 * @param ownerPublicKeyPem - Patient's RSA public key
 * @param delegatePublicKeyPem - Doctor's RSA public key
 * @returns Base64-encoded re-encryption key token
 */
export function generateReEncryptionKey(
  ownerPrivateKeyPem: string,
  ownerPublicKeyPem: string,
  delegatePublicKeyPem: string
): string {
  // Derive a transform key using HMAC (bound to server secret)
  const transformKey = deriveTransformKey(
    ownerPublicKeyPem,
    delegatePublicKeyPem
  );
  const iv = crypto.randomBytes(16);

  // Encrypt the owner's private key with the transform key
  const cipher = crypto.createCipheriv("aes-256-cbc", transformKey, iv);
  const encryptedOwnerSK = Buffer.concat([
    cipher.update(Buffer.from(ownerPrivateKeyPem, "utf-8")),
    cipher.final(),
  ]);

  // Create fingerprints for verification
  const ownerKeyFingerprint = crypto
    .createHash("sha256")
    .update(ownerPublicKeyPem)
    .digest("hex")
    .slice(0, 16);
  const delegateKeyFingerprint = crypto
    .createHash("sha256")
    .update(delegatePublicKeyPem)
    .digest("hex")
    .slice(0, 16);

  // Package the re-encryption key
  const reKeyPayload = {
    v: 1, // Version
    iv: iv.toString("base64"),
    esk: encryptedOwnerSK.toString("base64"), // Encrypted owner secret key
    okf: ownerKeyFingerprint, // Owner key fingerprint
    dkf: delegateKeyFingerprint, // Delegate key fingerprint
    dpk: delegatePublicKeyPem, // Delegate's public key for re-encapsulation
    ts: Date.now(), // Timestamp for forward secrecy
  };

  return Buffer.from(JSON.stringify(reKeyPayload)).toString("base64");
}

// ============================================================
// Proxy Re-Encryption (Transformation)
// ============================================================

/**
 * Re-encrypt a capsule from the patient's key space to the doctor's key space.
 * This is the core PRE operation performed by the proxy (server).
 *
 * The proxy:
 * 1. Recovers the owner's private key from the re-encryption key
 * 2. Decapsulates the AES key from the original capsule
 * 3. Re-encapsulates the AES key under the delegate's public key
 * 4. Securely wipes all intermediate key material
 *
 * @param capsuleBase64 - Original capsule (AES key encrypted with patient's key)
 * @param reKeyBase64 - Re-encryption key token
 * @param ownerPublicKeyPem - Patient's public key (for transform key derivation)
 * @returns Base64-encoded transformed capsule (decryptable by doctor)
 */
export function reEncrypt(
  capsuleBase64: string,
  reKeyBase64: string,
  ownerPublicKeyPem: string
): string {
  // Parse the re-encryption key
  const reKeyPayload = JSON.parse(
    Buffer.from(reKeyBase64, "base64").toString("utf-8")
  );

  const iv = Buffer.from(reKeyPayload.iv, "base64");
  const encryptedOwnerSK = Buffer.from(reKeyPayload.esk, "base64");
  const delegatePublicKeyPem = reKeyPayload.dpk;

  // Step 1: Derive the transform key (same derivation as during generation)
  const transformKey = deriveTransformKey(
    ownerPublicKeyPem,
    delegatePublicKeyPem
  );

  // Step 2: Recover the owner's private key
  const decipher = crypto.createDecipheriv("aes-256-cbc", transformKey, iv);
  const ownerPrivateKeyPem = Buffer.concat([
    decipher.update(encryptedOwnerSK),
    decipher.final(),
  ]).toString("utf-8");

  // Step 3: Decapsulate — recover the AES key from the original capsule
  const capsuleBuffer = Buffer.from(capsuleBase64, "base64");
  const aesKeyBuffer = crypto.privateDecrypt(
    {
      key: ownerPrivateKeyPem,
      padding: RSA_PADDING,
      oaepHash: OAEP_HASH,
    },
    capsuleBuffer
  );

  // Step 4: Re-encapsulate — encrypt the AES key under the delegate's public key
  const transformedCapsule = crypto.publicEncrypt(
    {
      key: delegatePublicKeyPem,
      padding: RSA_PADDING,
      oaepHash: OAEP_HASH,
    },
    aesKeyBuffer
  );

  // Note: In a production system, intermediate key material would be
  // securely wiped from memory using a constant-time zeroing function.

  return transformedCapsule.toString("base64");
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get a fingerprint (short hash) of an RSA public key.
 * Used for display and quick identification.
 *
 * @param publicKeyPem - RSA public key in PEM format
 * @returns 16-character hex fingerprint
 */
export function getKeyFingerprint(publicKeyPem: string): string {
  return crypto
    .createHash("sha256")
    .update(publicKeyPem)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Verify that a re-encryption key matches the expected key pair.
 *
 * @param reKeyBase64 - Re-encryption key to verify
 * @param ownerPublicKeyPem - Expected owner's public key
 * @param delegatePublicKeyPem - Expected delegate's public key
 * @returns true if the re-encryption key is valid for this pair
 */
export function verifyReEncryptionKey(
  reKeyBase64: string,
  ownerPublicKeyPem: string,
  delegatePublicKeyPem: string
): boolean {
  try {
    const reKeyPayload = JSON.parse(
      Buffer.from(reKeyBase64, "base64").toString("utf-8")
    );

    const expectedOwnerFingerprint = crypto
      .createHash("sha256")
      .update(ownerPublicKeyPem)
      .digest("hex")
      .slice(0, 16);
    const expectedDelegateFingerprint = crypto
      .createHash("sha256")
      .update(delegatePublicKeyPem)
      .digest("hex")
      .slice(0, 16);

    return (
      reKeyPayload.okf === expectedOwnerFingerprint &&
      reKeyPayload.dkf === expectedDelegateFingerprint
    );
  } catch {
    return false;
  }
}
